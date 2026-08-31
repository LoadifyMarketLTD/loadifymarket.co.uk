import { chromium } from '@playwright/test';

const productionOrigin = process.env.LOADIFY_PRODUCTION_ORIGIN || 'https://loadifymarket.co.uk';
const waitMs = Number(process.env.GSI_PROBE_WAIT_MS || 8000);

const browserModes = [
  {
    name: 'playwright-headless-shell',
    launchOptions: { headless: true },
  },
  {
    name: 'chromium-new-headless',
    launchOptions: { headless: true, channel: 'chromium' },
  },
];

const roles = ['buyer', 'seller'];

function redact(value) {
  return String(value ?? '')
    .replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi, '[google-client-id]')
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[jwt]');
}

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    const keys = [...url.searchParams.keys()];
    return `${url.origin}${url.pathname}${keys.length ? `?${keys.join('&')}` : ''}`;
  } catch {
    return redact(raw);
  }
}

async function installGsiInstrumentation(page) {
  await page.addInitScript(() => {
    const state = {
      events: [],
      wrapped: false,
      wrapErrors: [],
    };

    Object.defineProperty(window, '__LOADIFY_GSI_PROBE__', {
      configurable: true,
      value: state,
    });

    const capture = (type, details = {}) => {
      state.events.push({ type, at: Date.now(), ...details });
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
            autoSelect: config?.auto_select,
            useFedCmForPrompt: config?.use_fedcm_for_prompt,
            callbackPresent: typeof config?.callback === 'function',
          });
          return originalInitialize.call(this, config);
        };

        id.renderButton = function renderButtonProbe(parent, options) {
          capture('google.accounts.id.renderButton.before', {
            parentTag: parent?.tagName || null,
            parentChildCount: parent?.childNodes?.length ?? null,
            width: options?.width ?? null,
            type: options?.type ?? null,
            text: options?.text ?? null,
          });

          const result = originalRenderButton.call(this, parent, options);

          queueMicrotask(() => {
            capture('google.accounts.id.renderButton.microtask', {
              parentChildCount: parent?.childNodes?.length ?? null,
              parentText: String(parent?.textContent || '').slice(0, 200),
            });
          });

          setTimeout(() => {
            capture('google.accounts.id.renderButton.after-1000ms', {
              parentChildCount: parent?.childNodes?.length ?? null,
              parentText: String(parent?.textContent || '').slice(0, 200),
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

    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function addEventListenerProbe(type, listener, options) {
      const isGsiScript =
        this instanceof HTMLScriptElement &&
        this.id === 'loadify-google-gsi';

      if (isGsiScript && type === 'load' && typeof listener === 'function') {
        const wrappedListener = function wrappedGsiLoadListener(...args) {
          capture('gsi-script-load-listener.before');
          wrapGoogle();
          return listener.apply(this, args);
        };
        return nativeAddEventListener.call(this, type, wrappedListener, options);
      }

      return nativeAddEventListener.call(this, type, listener, options);
    };

    setInterval(wrapGoogle, 10);
  });
}

async function enableGoogleRegistration(page, role) {
  if (role === 'seller') {
    const selects = page.locator('form select');
    if (await selects.count()) {
      await selects.first().selectOption('company');
    }
  }

  const labels = page.locator('form label:has(input[type="checkbox"])');
  const labelCount = await labels.count();
  for (let index = 0; index < labelCount; index += 1) {
    const label = labels.nth(index);
    const text = (await label.innerText().catch(() => '')).trim();
    if (/Terms\s*&\s*Conditions|Seller Terms/i.test(text)) {
      const checkbox = label.locator('input[type="checkbox"]');
      if (!(await checkbox.isChecked())) await checkbox.check();
    }
  }
}

async function collectSnapshot(page) {
  return page.evaluate(() => {
    const clip = (value, max = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    };

    const script = document.getElementById('loadify-google-gsi');
    const busyNodes = [...document.querySelectorAll('[aria-busy]')].map((element) => ({
      tag: element.tagName,
      ariaBusy: element.getAttribute('aria-busy'),
      text: clip(element.textContent),
      childCount: element.childNodes.length,
      iframeCount: element.querySelectorAll('iframe').length,
      html: clip(element.innerHTML),
      rect: rect(element),
    }));

    const iframes = [...document.querySelectorAll('iframe')].map((iframe) => ({
      src: iframe.getAttribute('src') || '',
      title: iframe.getAttribute('title') || '',
      name: iframe.getAttribute('name') || '',
      rect: rect(iframe),
    }));

    const googleLikeElements = [
      ...document.querySelectorAll('[id^="gsi_"], [class*="gsi"], [id*="google" i], [class*="google" i]'),
    ].slice(0, 40).map((element) => ({
      tag: element.tagName,
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      text: clip(element.textContent, 200),
      rect: rect(element),
    }));

    return {
      url: location.href,
      readyState: document.readyState,
      formCount: document.querySelectorAll('form').length,
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
      busyNodes,
      iframes,
      googleLikeElements,
      probe: window.__LOADIFY_GSI_PROBE__ || null,
      alerts: [...document.querySelectorAll('[role="alert"]')].map((node) => clip(node.textContent, 300)),
      bodyGoogleText: [...document.querySelectorAll('body *')]
        .map((node) => clip(node.textContent, 180))
        .filter((text) => /Google registration|Sign up with Google|Loading Google/i.test(text))
        .slice(0, 20),
    };
  });
}

function classify(result) {
  const events = result.snapshot?.probe?.events || [];
  const initializeCalled = events.some((event) => event.type === 'google.accounts.id.initialize');
  const renderCalled = events.some((event) => event.type === 'google.accounts.id.renderButton.before');
  const hasGoogleIframe = (result.snapshot?.iframes || []).some((frame) => /accounts\.google\.com/i.test(frame.src));
  const renderedChildren = (result.snapshot?.busyNodes || []).some((node) => node.childCount > 0 && node.rect.width > 0 && node.rect.height > 0);
  const originError = result.console.some((entry) => /given origin is not allowed|GSI_LOGGER/i.test(entry.text));
  const google4xx = result.googleResponses.some((entry) => entry.status >= 400);

  if (originError) return 'PRODUCTION_GOOGLE_ORIGIN_REJECTED';
  if (renderCalled && renderedChildren && !hasGoogleIframe) return 'OLD_IFRAME_ASSERTION_INVALID_RENDER_PRESENT';
  if (renderCalled && hasGoogleIframe) return 'GSI_RENDERED_WITH_GOOGLE_IFRAME';
  if (initializeCalled && renderCalled && google4xx) return 'GSI_CALLED_GOOGLE_REQUEST_FAILED';
  if (initializeCalled && renderCalled && !renderedChildren) return 'GSI_CALLED_BUT_NO_RENDERED_CHILDREN';
  if (result.snapshot?.googleApi?.id && !initializeCalled) return 'GSI_API_PRESENT_INITIALIZE_NOT_OBSERVED';
  return 'INCONCLUSIVE';
}

async function probeRole(browser, browserName, role) {
  const context = await browser.newContext({
    locale: 'en-GB',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  const googleResponses = [];
  const failedRequests = [];

  page.on('console', (message) => {
    consoleEntries.push({
      type: message.type(),
      text: redact(message.text()),
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(redact(error?.stack || error?.message || error));
  });

  page.on('response', (response) => {
    const url = response.url();
    if (/https:\/\/(accounts|oauth2|www)\.google\.com\//i.test(url)) {
      googleResponses.push({
        status: response.status(),
        url: safeUrl(url),
      });
    }
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (/google\.com\//i.test(url)) {
      failedRequests.push({
        url: safeUrl(url),
        failure: redact(request.failure()?.errorText || 'unknown'),
      });
    }
  });

  await installGsiInstrumentation(page);

  const target = `${productionOrigin}/register?type=${role}`;
  const documentResponse = await page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });

  await page.locator('form').first().waitFor({ state: 'visible', timeout: 30000 });
  await enableGoogleRegistration(page, role);
  await page.waitForTimeout(waitMs);

  const snapshot = await collectSnapshot(page);
  const frames = page.frames().map((frame) => safeUrl(frame.url()));

  const result = {
    browser: browserName,
    role,
    documentHttp: documentResponse?.status() ?? null,
    finalUrl: safeUrl(page.url()),
    snapshot,
    frames,
    console: consoleEntries,
    pageErrors,
    googleResponses,
    failedRequests,
  };

  result.classification = classify(result);
  await context.close();
  return result;
}

function printResult(result) {
  console.log(`\n=== ${result.browser} / ${result.role.toUpperCase()} ===`);
  console.log(`DOCUMENT_HTTP=${result.documentHttp}`);
  console.log(`FINAL_URL=${result.finalUrl}`);
  console.log(`READY_STATE=${result.snapshot.readyState}`);
  console.log(`FORM_COUNT=${result.snapshot.formCount}`);
  console.log(`GSI_SCRIPT=${result.snapshot.script ? safeUrl(result.snapshot.script.src) : 'MISSING'}`);
  console.log(`GSI_SCRIPT_DATASET_LOADED=${result.snapshot.script?.datasetLoaded || 'false'}`);
  console.log(`GOOGLE_API=${JSON.stringify(result.snapshot.googleApi)}`);
  console.log(`PROBE_EVENTS=${JSON.stringify(result.snapshot.probe?.events || [])}`);
  console.log(`PROBE_WRAP_ERRORS=${JSON.stringify(result.snapshot.probe?.wrapErrors || [])}`);
  console.log(`ARIA_BUSY_NODES=${JSON.stringify(result.snapshot.busyNodes)}`);
  console.log(`IFRAMES=${JSON.stringify(result.snapshot.iframes.map((frame) => ({ ...frame, src: safeUrl(frame.src) })))}`);
  console.log(`GOOGLE_LIKE_ELEMENTS=${JSON.stringify(result.snapshot.googleLikeElements)}`);
  console.log(`FRAMES=${JSON.stringify(result.frames)}`);
  console.log(`GOOGLE_RESPONSES=${JSON.stringify(result.googleResponses)}`);
  console.log(`GOOGLE_REQUEST_FAILURES=${JSON.stringify(result.failedRequests)}`);
  console.log(`ALERTS=${JSON.stringify(result.snapshot.alerts)}`);

  const relevantConsole = result.console.filter((entry) =>
    entry.type === 'error' ||
    entry.type === 'warning' ||
    /google|gsi|content security policy|csp|frame|origin/i.test(entry.text),
  );
  console.log(`RELEVANT_CONSOLE=${JSON.stringify(relevantConsole)}`);
  console.log(`PAGE_ERRORS=${JSON.stringify(result.pageErrors)}`);
  console.log(`CLASSIFICATION=${result.classification}`);
}

const allResults = [];

for (const mode of browserModes) {
  let browser;
  try {
    browser = await chromium.launch(mode.launchOptions);
  } catch (error) {
    console.log(`\n=== ${mode.name} ===`);
    console.log(`BROWSER_LAUNCH=SKIP`);
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

const grouped = Object.groupBy(allResults, (result) => result.role);
for (const role of roles) {
  const results = grouped[role] || [];
  const classifications = results.map((result) => `${result.browser}:${result.classification}`);
  console.log(`\nSUMMARY_${role.toUpperCase()}=${JSON.stringify(classifications)}`);
}

console.log('\nREAD_ONLY_PROBE_COMPLETE');
