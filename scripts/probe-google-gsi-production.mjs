import { chromium } from '@playwright/test';

const productionOrigin = process.env.LOADIFY_PRODUCTION_ORIGIN || 'https://loadifymarket.co.uk';
const waitMs = Number(process.env.GSI_PROBE_WAIT_MS || 8000);

const browserModes = [
  { name: 'playwright-headless-shell', launchOptions: { headless: true } },
  { name: 'chromium-new-headless', launchOptions: { headless: true, channel: 'chromium' } },
];

const roles = ['buyer', 'seller'];
const GOOGLE_HOST_RE = /(^|\.)(google\.com|googleapis\.com|googleusercontent\.com)$/i;

function redact(value) {
  return String(value ?? '')
    .replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi, '[google-client-id]')
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[jwt]');
}

function safeUrl(raw, { keepRole = false } = {}) {
  try {
    const url = new URL(raw);
    const parts = [];
    for (const [key, value] of url.searchParams.entries()) {
      if (keepRole && key === 'type' && /^(buyer|seller)$/.test(value)) {
        parts.push(`${key}=${value}`);
      } else {
        parts.push(key);
      }
    }
    return `${url.origin}${url.pathname}${parts.length ? `?${parts.join('&')}` : ''}`;
  } catch {
    return redact(raw);
  }
}

function isGoogleIdentityUrl(raw) {
  try {
    const url = new URL(raw);
    return GOOGLE_HOST_RE.test(url.hostname) || /(^|\.)accounts\.google\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function installGsiInstrumentation(page) {
  await page.addInitScript(() => {
    const state = { events: [], wrapped: false, wrapErrors: [] };
    Object.defineProperty(window, '__LOADIFY_GSI_PROBE__', {
      configurable: true,
      value: state,
    });

    const capture = (type, details = {}) => {
      state.events.push({ type, at: Date.now(), ...details });
    };

    const describeParent = (parent) => {
      if (!(parent instanceof HTMLElement)) return {};
      const box = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      return {
        parentTag: parent.tagName,
        parentChildCount: parent.childNodes.length,
        parentText: String(parent.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        parentWidth: Math.round(box.width),
        parentHeight: Math.round(box.height),
        parentVisible: box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        parentAriaBusy: parent.getAttribute('aria-busy'),
      };
    };

    const wrapGoogle = () => {
      try {
        const id = window.google?.accounts?.id;
        if (!id || state.wrapped) return;

        const originalInitialize = id.initialize;
        const originalRenderButton = id.renderButton;
        if (typeof originalInitialize !== 'function' || typeof originalRenderButton !== 'function') return;

        id.initialize = function initializeProbe(config) {
          capture('google.accounts.id.initialize', {
            clientIdPresent: Boolean(config?.client_id),
            noncePresent: Boolean(config?.nonce),
            callbackPresent: typeof config?.callback === 'function',
            autoSelect: config?.auto_select,
            useFedCmForPrompt: config?.use_fedcm_for_prompt,
          });
          return originalInitialize.call(this, config);
        };

        id.renderButton = function renderButtonProbe(parent, options) {
          if (parent instanceof HTMLElement) {
            parent.setAttribute('data-loadify-gsi-probe-container', 'true');
          }

          capture('google.accounts.id.renderButton.before', {
            ...describeParent(parent),
            type: options?.type ?? null,
            text: options?.text ?? null,
            width: options?.width ?? null,
          });

          const result = originalRenderButton.call(this, parent, options);

          queueMicrotask(() => {
            capture('google.accounts.id.renderButton.microtask', describeParent(parent));
          });

          setTimeout(() => {
            capture('google.accounts.id.renderButton.after-1000ms', {
              ...describeParent(parent),
              iframeCount: parent?.querySelectorAll?.('iframe')?.length ?? null,
            });
          }, 1000);

          return result;
        };

        state.wrapped = true;
        capture('google.accounts.id.instrumented');
      } catch (error) {
        state.wrapErrors.push(String(error));
      }
    };

    const nativeAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function appendChildProbe(child) {
      if (
        child instanceof HTMLScriptElement &&
        (child.id === 'loadify-google-gsi' || /accounts\.google\.com\/gsi\/client/i.test(child.src || ''))
      ) {
        capture('gsi-script-appended', { id: child.id || '', srcPresent: Boolean(child.src) });
      }
      return nativeAppendChild.call(this, child);
    };

    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function addEventListenerProbe(type, listener, options) {
      const isGsiScript =
        this instanceof HTMLScriptElement &&
        (this.id === 'loadify-google-gsi' || /accounts\.google\.com\/gsi\/client/i.test(this.src || ''));

      if (isGsiScript && type === 'load' && typeof listener === 'function') {
        const wrappedListener = function wrappedGsiLoadListener(...args) {
          capture('gsi-script-load-listener.before');
          wrapGoogle();
          const result = listener.apply(this, args);
          capture('gsi-script-load-listener.after');
          return result;
        };
        return nativeAddEventListener.call(this, type, wrappedListener, options);
      }

      if (isGsiScript && type === 'error' && typeof listener === 'function') {
        const wrappedListener = function wrappedGsiErrorListener(...args) {
          capture('gsi-script-error-listener');
          return listener.apply(this, args);
        };
        return nativeAddEventListener.call(this, type, wrappedListener, options);
      }

      return nativeAddEventListener.call(this, type, listener, options);
    };

    setInterval(wrapGoogle, 10);
  });
}

async function locateRegistrationForm(page, role) {
  await page.waitForFunction(() => document.querySelectorAll('form').length > 0, undefined, { timeout: 30000 });

  const discovery = await page.evaluate((expectedRole) => {
    const forms = [...document.querySelectorAll('form')];
    const candidates = forms.map((form, index) => {
      const email = form.querySelector('input[type="email"][autocomplete="email"]');
      const newPasswords = form.querySelectorAll('input[autocomplete="new-password"]');
      const termsLink = form.querySelector('a[href="/terms"]');
      const privacyLink = form.querySelector('a[href="/privacy"]');
      const sellerTermsLink = form.querySelector('a[href="/seller-terms"]');
      const sellerSelect = form.querySelector('select');
      const headings = [...form.querySelectorAll('h1,h2,h3')].map((node) => (node.textContent || '').trim());
      const score =
        (email ? 4 : 0) +
        (newPasswords.length >= 2 ? 4 : 0) +
        (termsLink ? 3 : 0) +
        (privacyLink ? 1 : 0) +
        (expectedRole === 'seller' && sellerSelect ? 2 : 0) +
        (expectedRole === 'seller' && sellerTermsLink ? 2 : 0);

      return {
        index,
        score,
        email: Boolean(email),
        newPasswordCount: newPasswords.length,
        termsLink: Boolean(termsLink),
        privacyLink: Boolean(privacyLink),
        sellerTermsLink: Boolean(sellerTermsLink),
        sellerSelect: Boolean(sellerSelect),
        headings,
      };
    });

    const valid = candidates
      .filter((candidate) => candidate.email && candidate.newPasswordCount >= 2 && candidate.termsLink)
      .sort((a, b) => b.score - a.score);

    if (valid.length !== 1) {
      return { ok: false, candidates };
    }

    forms[valid[0].index].setAttribute('data-loadify-registration-probe', 'true');
    return { ok: true, selected: valid[0], candidates };
  }, role);

  if (!discovery.ok) {
    throw new Error(`${role.toUpperCase()}: unable to uniquely identify the Loadify registration form structurally. Candidates=${JSON.stringify(discovery.candidates)}`);
  }

  const form = page.locator('form[data-loadify-registration-probe="true"]');
  await form.waitFor({ state: 'visible', timeout: 10000 });
  return { form, discovery };
}

async function registrationEnablementSnapshot(form) {
  return form.evaluate((formElement) => {
    const clip = (value, max = 300) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const checkboxes = [...formElement.querySelectorAll('input[type="checkbox"]')].map((input) => ({
      checked: input.checked,
      hrefs: [...(input.closest('label')?.querySelectorAll('a') || [])].map((anchor) => anchor.getAttribute('href') || ''),
      labelText: clip(input.closest('label')?.textContent || ''),
    }));

    const selects = [...formElement.querySelectorAll('select')].map((select) => ({
      value: select.value,
      labelText: clip(select.closest('label')?.textContent || ''),
    }));

    const disabledGoogleButton = [...formElement.querySelectorAll('button')].find((button) =>
      /Sign up with Google/i.test(button.textContent || ''),
    );

    const ariaBusyNodes = [...formElement.querySelectorAll('[aria-busy]')].map((element) => {
      const box = element.getBoundingClientRect();
      return {
        ariaBusy: element.getAttribute('aria-busy'),
        text: clip(element.textContent),
        childCount: element.childNodes.length,
        width: Math.round(box.width),
        height: Math.round(box.height),
        visible: visible(element),
      };
    });

    return {
      checkboxes,
      selects,
      disabledGoogleButton: disabledGoogleButton ? {
        disabled: disabledGoogleButton.disabled,
        visible: visible(disabledGoogleButton),
      } : null,
      ariaBusyNodes,
    };
  });
}

async function enableGoogleRegistration(form, role) {
  if (role === 'seller') {
    const sellerSelect = form.locator('select').first();
    if ((await sellerSelect.count()) !== 1) {
      throw new Error('SELLER: expected one legal-type select in the registration form.');
    }
    await sellerSelect.selectOption('company');
  }

  const termsCheckbox = form.locator('label:has(a[href="/terms"]) input[type="checkbox"]').first();
  if ((await termsCheckbox.count()) !== 1) {
    throw new Error(`${role.toUpperCase()}: Terms checkbox linked to /terms was not uniquely located.`);
  }
  if (!(await termsCheckbox.isChecked())) await termsCheckbox.check();

  if (role === 'seller') {
    const sellerTermsCheckbox = form.locator('label:has(a[href="/seller-terms"]) input[type="checkbox"]').first();
    if ((await sellerTermsCheckbox.count()) !== 1) {
      throw new Error('SELLER: Seller Terms checkbox linked to /seller-terms was not uniquely located.');
    }
    if (!(await sellerTermsCheckbox.isChecked())) await sellerTermsCheckbox.check();
  }

  await form.evaluate((formElement, expectedRole) => {
    const terms = formElement.querySelector('label:has(a[href="/terms"]) input[type="checkbox"]');
    if (!terms?.checked) throw new Error('Terms prerequisite did not become checked.');

    if (expectedRole === 'seller') {
      const sellerTerms = formElement.querySelector('label:has(a[href="/seller-terms"]) input[type="checkbox"]');
      const sellerSelect = formElement.querySelector('select');
      if (!sellerTerms?.checked) throw new Error('Seller Terms prerequisite did not become checked.');
      if (!sellerSelect?.value) throw new Error('Seller legal type prerequisite did not become selected.');
    }
  }, role);
}

async function collectSnapshot(page) {
  return page.evaluate(() => {
    const clip = (value, max = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    };
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const registrationForm = document.querySelector('form[data-loadify-registration-probe="true"]');
    const script = document.getElementById('loadify-google-gsi') ||
      [...document.scripts].find((node) => /accounts\.google\.com\/gsi\/client/i.test(node.src || '')) || null;
    const trackedContainer = document.querySelector('[data-loadify-gsi-probe-container="true"]');

    const registrationBusyNodes = registrationForm
      ? [...registrationForm.querySelectorAll('[aria-busy]')].map((element) => ({
          tag: element.tagName,
          ariaBusy: element.getAttribute('aria-busy'),
          text: clip(element.textContent),
          childCount: element.childNodes.length,
          rect: rect(element),
          visible: visible(element),
        }))
      : [];

    const trackedContainerState = trackedContainer ? {
      ariaBusy: trackedContainer.getAttribute('aria-busy'),
      childCount: trackedContainer.childNodes.length,
      text: clip(trackedContainer.textContent),
      html: clip(trackedContainer.innerHTML),
      rect: rect(trackedContainer),
      visible: visible(trackedContainer),
    } : null;

    const iframes = [...document.querySelectorAll('iframe')].map((iframe) => ({
      src: iframe.getAttribute('src') || '',
      title: iframe.getAttribute('title') || '',
      name: iframe.getAttribute('name') || '',
      rect: rect(iframe),
    }));

    return {
      readyState: document.readyState,
      formCount: document.querySelectorAll('form').length,
      registrationFormPresent: Boolean(registrationForm),
      googleApi: {
        google: Boolean(window.google),
        accounts: Boolean(window.google?.accounts),
        id: Boolean(window.google?.accounts?.id),
        initialize: typeof window.google?.accounts?.id?.initialize === 'function',
        renderButton: typeof window.google?.accounts?.id?.renderButton === 'function',
      },
      script: script ? {
        src: script.getAttribute('src') || '',
        datasetLoaded: script.dataset.loaded || '',
        isConnected: script.isConnected,
      } : null,
      registrationBusyNodes,
      trackedContainer: trackedContainerState,
      iframes,
      probe: window.__LOADIFY_GSI_PROBE__ || null,
      alerts: [...document.querySelectorAll('[role="alert"]')].map((node) => clip(node.textContent, 300)),
    };
  });
}

function verdict(result) {
  const events = result.snapshot?.probe?.events || [];
  const initializeCalled = events.some((event) => event.type === 'google.accounts.id.initialize');
  const renderCalled = events.some((event) => event.type === 'google.accounts.id.renderButton.before');
  const renderAfter = [...events].reverse().find((event) => event.type === 'google.accounts.id.renderButton.after-1000ms');

  const consoleText = [
    ...result.console.map((entry) => entry.text),
    ...result.pageErrors,
    ...result.snapshot.alerts,
  ].join('\n');

  const originClientRejected = /given origin is not allowed|origin[^\n]*(not allowed|mismatch|unauthori[sz]ed)|client.?id[^\n]*(invalid|mismatch|not allowed|unauthori[sz]ed)|GSI_LOGGER[^\n]*(origin|client)/i.test(consoleText);
  const google4xx = result.googleResponses.filter((entry) => entry.status >= 400 && entry.status < 500);

  const tracked = result.snapshot.trackedContainer;
  const renderedOutput = Boolean(
    (tracked && tracked.visible && tracked.rect.width > 0 && tracked.rect.height > 0 && tracked.childCount > 0) ||
    (renderAfter && renderAfter.parentVisible && renderAfter.parentWidth > 0 && renderAfter.parentHeight > 0 && renderAfter.parentChildCount > 0),
  );

  if (originClientRejected || google4xx.length) {
    return {
      status: 'FAIL — GOOGLE ORIGIN/CLIENT REJECTED',
      reason: google4xx.length
        ? `Google Identity/OAuth returned ${google4xx.map((entry) => `HTTP ${entry.status} ${entry.url}`).join(', ')}.`
        : 'Google console/runtime evidence indicates an origin/client authorization rejection.',
    };
  }

  if (!result.snapshot.googleApi.id) {
    return {
      status: 'FAIL — GOOGLE API ABSENT',
      reason: result.snapshot.script
        ? 'The GSI script element exists, but window.google.accounts.id is absent after the wait window.'
        : 'No GSI script element and no window.google.accounts.id were observed after the actual Loadify registration prerequisites were satisfied.',
    };
  }

  if (!initializeCalled) {
    return {
      status: 'FAIL — INITIALIZE NOT CALLED',
      reason: 'window.google.accounts.id is available, but Loadify did not call google.accounts.id.initialize().',
    };
  }

  if (!renderCalled) {
    return {
      status: 'FAIL — RENDERBUTTON NOT CALLED',
      reason: 'GSI initialize() was observed, but Loadify did not call google.accounts.id.renderButton().',
    };
  }

  if (!renderedOutput) {
    return {
      status: 'FAIL — RENDER CALLED NO OUTPUT',
      reason: 'GSI initialize() and renderButton() were observed, but the actual React render container had no visible output.',
    };
  }

  return {
    status: 'PASS — GSI INITIALIZED AND RENDERED',
    reason: 'window.google.accounts.id is present, initialize() and renderButton() were observed, and the actual Loadify React container contains visible rendered output.',
  };
}

async function probeRole(browser, browserName, role) {
  const context = await browser.newContext({ locale: 'en-GB', serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  const googleResponses = [];
  const failedRequests = [];

  page.on('console', (message) => {
    consoleEntries.push({ type: message.type(), text: redact(message.text()) });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(redact(error?.stack || error?.message || error));
  });

  page.on('response', (response) => {
    if (isGoogleIdentityUrl(response.url())) {
      googleResponses.push({ status: response.status(), url: safeUrl(response.url()) });
    }
  });

  page.on('requestfailed', (request) => {
    if (isGoogleIdentityUrl(request.url())) {
      failedRequests.push({
        url: safeUrl(request.url()),
        failure: redact(request.failure()?.errorText || 'unknown'),
      });
    }
  });

  await installGsiInstrumentation(page);

  const target = `${productionOrigin}/register?type=${role}`;
  const documentResponse = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const { form: registrationForm, discovery } = await locateRegistrationForm(page, role);
  const preEnablement = await registrationEnablementSnapshot(registrationForm);
  await enableGoogleRegistration(registrationForm, role);
  const postEnablement = await registrationEnablementSnapshot(registrationForm);

  await page.waitForFunction(() => {
    const probe = window.__LOADIFY_GSI_PROBE__;
    return Boolean(
      probe?.events?.some((event) => event.type === 'google.accounts.id.renderButton.before') ||
      window.google?.accounts?.id ||
      document.getElementById('loadify-google-gsi') ||
      document.querySelector('[data-loadify-gsi-probe-container="true"]'),
    );
  }, undefined, { timeout: Math.max(1500, waitMs) }).catch(() => {});

  await page.waitForTimeout(Math.min(1500, waitMs));

  const snapshot = await collectSnapshot(page);
  const frames = page.frames().map((frame) => safeUrl(frame.url(), { keepRole: true }));

  const result = {
    browser: browserName,
    role,
    discovery,
    documentHttp: documentResponse?.status() ?? null,
    finalUrl: safeUrl(page.url(), { keepRole: true }),
    preEnablement,
    postEnablement,
    snapshot,
    frames,
    console: consoleEntries,
    pageErrors,
    googleResponses,
    failedRequests,
  };

  result.verdict = verdict(result);
  await context.close();
  return result;
}

function printResult(result) {
  const googleIframeObserved = result.snapshot.iframes.some((frame) => {
    try {
      return /(^|\.)accounts\.google\.com$/i.test(new URL(frame.src).hostname);
    } catch {
      return false;
    }
  });

  const relevantConsole = result.console.filter((entry) =>
    entry.type === 'error' ||
    entry.type === 'warning' ||
    /google|gsi|content security policy|csp|frame|origin|oauth|client.?id/i.test(entry.text),
  );

  console.log(`\n=== ${result.browser} / ${result.role.toUpperCase()} ===`);
  console.log(`DOCUMENT_HTTP=${result.documentHttp}`);
  console.log(`FINAL_URL=${result.finalUrl}`);
  console.log(`READY_STATE=${result.snapshot.readyState}`);
  console.log(`FORM_COUNT=${result.snapshot.formCount}`);
  console.log(`REGISTRATION_FORM_PRESENT=${result.snapshot.registrationFormPresent ? 'YES' : 'NO'}`);
  console.log(`REGISTRATION_FORM_DISCOVERY=${JSON.stringify(result.discovery.selected)}`);
  console.log(`PRE_ENABLEMENT=${JSON.stringify(result.preEnablement)}`);
  console.log(`POST_ENABLEMENT=${JSON.stringify(result.postEnablement)}`);
  console.log(`GSI_SCRIPT=${result.snapshot.script ? safeUrl(result.snapshot.script.src) : 'MISSING'}`);
  console.log(`GSI_SCRIPT_DATASET_LOADED=${result.snapshot.script?.datasetLoaded || 'false'}`);
  console.log(`GOOGLE_API=${JSON.stringify(result.snapshot.googleApi)}`);
  console.log(`PROBE_EVENTS=${JSON.stringify(result.snapshot.probe?.events || [])}`);
  console.log(`PROBE_WRAP_ERRORS=${JSON.stringify(result.snapshot.probe?.wrapErrors || [])}`);
  console.log(`GSI_REACT_CONTAINER=${JSON.stringify(result.snapshot.trackedContainer)}`);
  console.log(`REGISTRATION_ARIA_BUSY_NODES=${JSON.stringify(result.snapshot.registrationBusyNodes)}`);
  console.log(`GOOGLE_IFRAME_OBSERVED=${googleIframeObserved ? 'YES' : 'NO'}`);
  console.log(`IFRAMES_INFO=${JSON.stringify(result.snapshot.iframes.map((frame) => ({ ...frame, src: safeUrl(frame.src) })))}`);
  console.log(`FRAMES=${JSON.stringify(result.frames)}`);
  console.log(`GOOGLE_RESPONSES=${JSON.stringify(result.googleResponses)}`);
  console.log(`GOOGLE_REQUEST_FAILURES=${JSON.stringify(result.failedRequests)}`);
  console.log(`ALERTS=${JSON.stringify(result.snapshot.alerts)}`);
  console.log(`RELEVANT_CONSOLE=${JSON.stringify(relevantConsole)}`);
  console.log(`PAGE_ERRORS=${JSON.stringify(result.pageErrors)}`);
  console.log(`VERDICT=${result.verdict.status}`);
  console.log(`VERDICT_REASON=${result.verdict.reason}`);
}

const allResults = [];

for (const mode of browserModes) {
  let browser;
  try {
    browser = await chromium.launch(mode.launchOptions);
  } catch (error) {
    console.log(`\n=== ${mode.name} ===`);
    console.log('BROWSER_LAUNCH=SKIP');
    console.log(`REASON=${redact(error instanceof Error ? error.message : error)}`);
    continue;
  }

  try {
    for (const role of roles) {
      try {
        const result = await probeRole(browser, mode.name, role);
        allResults.push(result);
        printResult(result);
      } catch (error) {
        console.log(`\n=== ${mode.name} / ${role.toUpperCase()} ===`);
        console.log('PROBE=FAILED');
        console.log(`REASON=${redact(error instanceof Error ? error.stack || error.message : error)}`);
      }
    }
  } finally {
    await browser.close();
  }
}

for (const role of roles) {
  const results = allResults.filter((result) => result.role === role);
  const summaries = results.map((result) => `${result.browser}:${result.verdict.status}`);
  const passCount = results.filter((result) => result.verdict.status.startsWith('PASS')).length;
  const dualModeState = results.length < 2
    ? 'INCOMPLETE'
    : passCount === results.length
      ? 'BOTH_PASS'
      : passCount === 0
        ? 'BOTH_FAIL'
        : 'HEADLESS_MODE_DIFFERENCE';

  console.log(`\nSUMMARY_${role.toUpperCase()}=${JSON.stringify(summaries)}`);
  console.log(`DUAL_HEADLESS_${role.toUpperCase()}=${dualModeState}`);
}

console.log('\nREAD_ONLY_PROBE_COMPLETE');
