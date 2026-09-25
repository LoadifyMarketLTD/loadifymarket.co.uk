import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier SEO and legal differentiation", () => {
  const productMeta = read("netlify/edge-functions/product-meta.ts");
  const terms = read("src/pages/pixel-perfect/TermsAndConditions.tsx");
  const buyerTerms = read("src/pages/pixel-perfect/BuyerTerms.tsx");
  const returns = read("src/pages/pixel-perfect/ReturnsPolicy.tsx");
  const shipping = read("src/pages/pixel-perfect/ShippingPolicy.tsx");
  const indexHtml = read("index.html");
  const buyerHowItWorks = read("src/components/HowItWorksBuyers.tsx");
  const onboarding = read("src/pages/AppOnboarding.tsx");
  const email = read("netlify/functions/send-email.ts");

  it("indexes eligible supplier projections through the same product metadata surface", () => {
    expect(productMeta).toContain("fetchSupplierProductData");
    expect(productMeta).toContain("/.netlify/functions/supplier-catalog?id=");
    expect(productMeta).toContain("item.commercialMode !== 'loadify_supplier_fulfilled'");
    expect(productMeta).toContain("lookup = await fetchSupplierProductData(productRef, requestUrl.origin, marketContext.market)");
  });

  it("emits marketplace seller identity for seller listings and Loadify identity for supplier-fulfilled offers", () => {
    expect(productMeta).toContain("fetchPublicSellerName");
    expect(productMeta).toContain("isSupplierFulfilled");
    expect(productMeta).toContain("name: sellerName");
    expect(productMeta).toContain("name: SITE_NAME");
    expect(productMeta).toContain("legalName: LEGAL_OPERATOR_NAME");
    expect(productMeta).toContain("priceCurrency");
  });

  it("documents the two seller-of-record models in core buyer legal surfaces", () => {
    for (const source of [terms, buyerTerms, returns, shipping]) {
      expect(source).toContain("Marketplace Seller");
      expect(source).toContain("Loadify Supplier-Fulfilled");
    }
    expect(terms).toContain("Loadify is the seller and merchant of record");
    expect(buyerTerms).toContain("seller of record");
    expect(returns).toContain("Loadify remains the buyer's customer-facing seller");
    expect(shipping).toContain("approved supplier or fulfilment provider on Loadify's behalf");
  });

  it("removes the obsolete blanket claims that Loadify can never be the seller or fulfiller", () => {
    for (const source of [terms, buyerTerms, returns, shipping]) {
      expect(source).not.toMatch(/Loadify Market is not the seller of any products/i);
      expect(source).not.toMatch(/Loadify Market does not ship or dispatch any products/i);
      expect(source).not.toMatch(/sales contract for any purchase is between the buyer and the seller/i);
    }
  });

  it("does not market the catalogue as verified UK sellers only", () => {
    for (const source of [indexHtml, buyerHowItWorks, onboarding]) {
      expect(source).not.toMatch(/verified UK sellers/i);
    }
    expect(indexHtml).toContain("supplier-fulfilled product routes");
    expect(buyerHowItWorks).toContain("Loadify Supplier-Fulfilled");
    expect(onboarding).toContain("Loadify Supplier-Fulfilled");
  });

  it("keeps transactional order messaging truthful for both fulfilment models", () => {
    expect(email).toContain("Marketplace Seller orders are sold and fulfilled by the independent seller");
    expect(email).toContain("Loadify Supplier-Fulfilled orders are sold by Loadify Market");
    expect(email).not.toContain("Loadify Market is the marketplace platform and is not the seller of the products");
  });
});