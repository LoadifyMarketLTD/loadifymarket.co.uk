import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 8_000;

export interface OperatorProductUrlPreviewV1 {
  interfaceVersion: 1;
  requestedUrl: string;
  finalUrl: string;
  sourceHost: string;
  sourceDigest: string;
  sourceType: "json_ld_product" | "open_graph_fallback";
  observedAt: string;
  facts: {
    title?: string;
    description?: string;
    brand?: string;
    sku?: string;
    gtin?: string;
    mpn?: string;
    price?: string;
    currency?: string;
    availability?: string;
    productUrl?: string;
    images: string[];
  };
  governance: {
    candidateOnly: true;
    aiFactsLock: true;
    assetRightsStatus: "unverified";
    supplierIdentityRequired: true;
    complianceReviewRequired: true;
    marketplaceListingAllowed: false;
    commercialActivationAllowed: false;
  };
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ipv4ToInt(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((nums[0] * 256 + nums[1]) * 256 + nums[2]) * 256 + nums[3]) >>> 0;
}

function inV4Range(address: string, base: string, prefix: number): boolean {
  const value = ipv4ToInt(address);
  const start = ipv4ToInt(base);
  if (value === null || start === null) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (start & mask);
}

export function isForbiddenOutboundAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
      ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
      ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
      ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return blocked.some(([base, prefix]) => inV4Range(address, base, prefix));
  }

  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(lower)) return true;
    if (lower.startsWith("ff")) return true;
    if (lower === "2001:db8::" || lower.startsWith("2001:db8:")) return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isForbiddenOutboundAddress(mapped[1]);
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const high = Number.parseInt(mappedHex[1], 16);
      const low = Number.parseInt(mappedHex[2], 16);
      const dotted = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
      return isForbiddenOutboundAddress(dotted);
    }
  }

  return false;
}
export async function validatePublicProductUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("A valid product URL is required");
  }

  if (url.protocol !== "https:") throw new Error("Product source URL must use HTTPS");
  if (url.username || url.password) throw new Error("Product source URL must not contain credentials");
  if (url.port && url.port !== "443") throw new Error("Custom URL ports are not allowed");

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Local network URLs are not allowed");
  }

  if (isIP(host) && isForbiddenOutboundAddress(host)) {
    throw new Error("Private or reserved network addresses are not allowed");
  }

  let resolved;
  try {
    resolved = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Product source hostname could not be resolved");
  }
  if (resolved.length === 0 || resolved.some((entry) => isForbiddenOutboundAddress(entry.address))) {
    throw new Error("Product source resolves to a private or reserved network");
  }

  return url;
}

interface ResolvedPublicTarget {
  url: URL;
  address: string;
  family: 4 | 6;
}

async function resolvePublicTarget(rawUrl: string): Promise<ResolvedPublicTarget> {
  const url = await validatePublicProductUrl(rawUrl);
  const resolved = await lookup(url.hostname, { all: true, verbatim: true });
  const safe = resolved.filter((entry) => !isForbiddenOutboundAddress(entry.address));
  if (safe.length !== resolved.length || safe.length === 0) {
    throw new Error("Product source resolves to a private or reserved network");
  }
  return { url, address: safe[0].address, family: safe[0].family as 4 | 6 };
}

function requestPinnedHtml(target: ResolvedPublicTarget): Promise<{
  status: number;
  location?: string;
  contentType?: string;
  html?: string;
}> {
  return new Promise((resolve, reject) => {
    const req = request({
      protocol: "https:",
      hostname: target.url.hostname,
      port: 443,
      method: "GET",
      path: `${target.url.pathname}${target.url.search}`,
      servername: target.url.hostname,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "User-Agent": "LoadifyMarket-ProductSourcePreview/1.0",
      },
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = typeof response.headers.location === "string" ? response.headers.location : undefined;
      const contentType = typeof response.headers["content-type"] === "string"
        ? response.headers["content-type"].toLowerCase()
        : undefined;

      if (status >= 300 && status < 400) {
        response.resume();
        resolve({ status, location, contentType });
        return;
      }

      const contentLength = Number(response.headers["content-length"] || "0");
      if (contentLength > MAX_HTML_BYTES) {
        response.destroy();
        reject(new Error("Product source page is too large"));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.byteLength;
        if (total > MAX_HTML_BYTES) {
          response.destroy(new Error("Product source page is too large"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => resolve({
        status,
        location,
        contentType,
        html: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", reject);
    });

    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error("Product source request timed out")));
    req.on("error", (error) => reject(
      error.message.includes("timed out") ? error : new Error("Product source could not be fetched"),
    ));
    req.end();
  });
}

async function fetchPublicHtml(rawUrl: string): Promise<{ finalUrl: URL; html: string }> {
  let target = await resolvePublicTarget(rawUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await requestPinnedHtml(target);

    if (response.status >= 300 && response.status < 400) {
      if (redirect === MAX_REDIRECTS) throw new Error("Product source redirected too many times");
      if (!response.location) throw new Error("Product source returned an invalid redirect");
      target = await resolvePublicTarget(new URL(response.location, target.url).toString());
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Product source returned HTTP ${response.status}`);
    }
    if (!response.contentType?.includes("text/html") && !response.contentType?.includes("application/xhtml+xml")) {
      throw new Error("Product source must return an HTML page");
    }

    return { finalUrl: target.url, html: response.html ?? "" };
  }

  throw new Error("Product source redirect handling failed");
}
function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return text(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = firstString(item);
      if (candidate) return candidate;
    }
  }
  if (isRecord(value)) return text(value.url) || text(value.contentUrl);
  return undefined;
}

function imageList(value: unknown): string[] {
  const candidates = Array.isArray(value) ? value : [value];
  const urls: string[] = [];
  for (const candidate of candidates) {
    const url = firstString(candidate);
    if (url && /^https:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, 12);
}

function typeIncludesProduct(value: unknown): boolean {
  if (typeof value === "string") return value.toLowerCase() === "product";
  return Array.isArray(value) && value.some(typeIncludesProduct);
}

function findProductNode(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductNode(item);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (typeIncludesProduct(value["@type"])) return value;
  const graph = value["@graph"];
  if (graph) return findProductNode(graph);
  return null;
}
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function readMeta(html: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = match[0];
    const attrs = new Map<string, string>();
    for (const attr of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
      attrs.set(attr[1].toLowerCase(), decodeHtmlEntities(attr[2].trim()));
    }
    const key = attrs.get("property") || attrs.get("name");
    const content = attrs.get("content");
    if (key && content && !result.has(key.toLowerCase())) result.set(key.toLowerCase(), content);
  }
  return result;
}

function extractJsonLdProduct(html: string): JsonRecord | null {
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = match[1].trim();
    if (!raw || raw.length > 750_000) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const product = findProductNode(parsed);
      if (product) return product;
    } catch {
      // Invalid third-party JSON-LD is ignored; Open Graph remains available.
    }
  }
  return null;
}

function firstOffer(product: JsonRecord): JsonRecord | null {
  const offers = product.offers;
  if (Array.isArray(offers)) return offers.find(isRecord) ?? null;
  return isRecord(offers) ? offers : null;
}

export function extractProductFactsFromHtml(html: string, finalUrl: string): {
  sourceType: OperatorProductUrlPreviewV1["sourceType"];
  facts: OperatorProductUrlPreviewV1["facts"];
} {
  const product = extractJsonLdProduct(html);
  const meta = readMeta(html);
  if (product) {
    const offer = firstOffer(product);
    const brand = isRecord(product.brand) ? text(product.brand.name) : text(product.brand);
    const gtin = text(product.gtin13) || text(product.gtin14) || text(product.gtin12) || text(product.gtin8) || text(product.gtin);
    const images = imageList(product.image);
    const facts: OperatorProductUrlPreviewV1["facts"] = {
      title: text(product.name) || meta.get("og:title"),
      description: text(product.description) || meta.get("og:description") || meta.get("description"),
      brand,
      sku: text(product.sku),
      gtin,
      mpn: text(product.mpn),
      price: offer ? text(offer.price) : undefined,
      currency: offer ? text(offer.priceCurrency) : undefined,
      availability: offer ? text(offer.availability) : undefined,
      productUrl: text(product.url) || finalUrl,
      images: images.length ? images : imageList(meta.get("og:image")),
    };
    return { sourceType: "json_ld_product", facts };
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    sourceType: "open_graph_fallback",
    facts: {
      title: meta.get("og:title") || (titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, "").trim()) : undefined),
      description: meta.get("og:description") || meta.get("description"),
      price: meta.get("product:price:amount") || meta.get("og:price:amount"),
      currency: meta.get("product:price:currency") || meta.get("og:price:currency"),
      productUrl: meta.get("og:url") || finalUrl,
      images: imageList(meta.get("og:image")),
    },
  };
}

export async function previewOperatorProductUrl(rawUrl: string): Promise<OperatorProductUrlPreviewV1> {
  const requested = await validatePublicProductUrl(rawUrl);
  const { finalUrl, html } = await fetchPublicHtml(requested.toString());
  const extracted = extractProductFactsFromHtml(html, finalUrl.toString());

  if (!extracted.facts.title) throw new Error("No product title could be identified on the source page");

  return {
    interfaceVersion: 1,
    requestedUrl: requested.toString(),
    finalUrl: finalUrl.toString(),
    sourceHost: finalUrl.hostname.toLowerCase(),
    sourceDigest: createHash("sha256").update(html).digest("hex"),
    sourceType: extracted.sourceType,
    observedAt: new Date().toISOString(),
    facts: extracted.facts,
    governance: {
      candidateOnly: true,
      aiFactsLock: true,
      assetRightsStatus: "unverified",
      supplierIdentityRequired: true,
      complianceReviewRequired: true,
      marketplaceListingAllowed: false,
      commercialActivationAllowed: false,
    },
  };
}
