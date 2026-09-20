import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractProductFactsFromHtml,
  isForbiddenOutboundAddress,
} from "../_shared/operatorProductUrlPreview";

const previewSource = readFileSync(resolve(process.cwd(), "netlify/functions/_shared/operatorProductUrlPreview.ts"), "utf8");

describe("operator product URL preview", () => {
  it("blocks private, loopback, link-local and documentation address space", () => {
    for (const address of [
      "127.0.0.1",
      "10.10.0.2",
      "172.16.1.2",
      "192.168.1.20",
      "169.254.169.254",
      "100.64.0.1",
      "192.0.2.4",
      "198.51.100.4",
      "203.0.113.4",
      "::1",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
    ]) {
      expect(isForbiddenOutboundAddress(address), address).toBe(true);
    }
    expect(isForbiddenOutboundAddress("8.8.8.8")).toBe(false);
    expect(isForbiddenOutboundAddress("1.1.1.1")).toBe(false);
  });

  it("pins outbound HTTPS to a DNS-validated address and revalidates redirects", () => {
    expect(previewSource).toContain('import { request } from "node:https"');
    expect(previewSource).toContain("lookup: (_hostname, _options, callback)");
    expect(previewSource).toContain("target.address");
    expect(previewSource).toContain("resolvePublicTarget(new URL(response.location, target.url).toString())");
    expect(previewSource).not.toContain("await fetch(current");
  });

  it("extracts verified product facts from JSON-LD without inventing fields", () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context":"https://schema.org",
        "@type":"Product",
        "name":"Test Kettle",
        "description":"1.7 litre kettle",
        "brand":{"@type":"Brand","name":"Example"},
        "sku":"K-100",
        "gtin13":"5012345678900",
        "image":["https://cdn.example.test/kettle.jpg"],
        "offers":{"@type":"Offer","price":"24.99","priceCurrency":"GBP","availability":"https://schema.org/InStock"}
      }
      </script>
      </head></html>
    `;
    const result = extractProductFactsFromHtml(html, "https://supplier.example.test/kettle");
    expect(result.sourceType).toBe("json_ld_product");
    expect(result.facts).toMatchObject({
      title: "Test Kettle",
      description: "1.7 litre kettle",
      brand: "Example",
      sku: "K-100",
      gtin: "5012345678900",
      price: "24.99",
      currency: "GBP",
    });
    expect(result.facts.images).toEqual(["https://cdn.example.test/kettle.jpg"]);
    expect(result.facts.mpn).toBeUndefined();
  });

  it("falls back to Open Graph metadata for preview only", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Fallback Product">
        <meta property="og:description" content="Supplier description">
        <meta property="og:image" content="https://cdn.example.test/product.jpg">
        <meta property="product:price:amount" content="12.50">
        <meta property="product:price:currency" content="GBP">
      </head></html>
    `;
    const result = extractProductFactsFromHtml(html, "https://supplier.example.test/product");
    expect(result.sourceType).toBe("open_graph_fallback");
    expect(result.facts.title).toBe("Fallback Product");
    expect(result.facts.price).toBe("12.50");
    expect(result.facts.currency).toBe("GBP");
  });
});
