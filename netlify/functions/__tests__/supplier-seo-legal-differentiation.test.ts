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

  it("emits the independent supplier identity for supplier marketplace offers", () => {
    expect(productMeta).toContain("fetchPublicSellerName");
    expect(productMeta).toContain("isSupplierFulfilled");
    expect(productMeta).toContain("supplierName");
    expect(productMeta).toContain("supplierLegalName");
    expect(productMeta).toContain("name: sellerName");
    expect(productMeta).not.toContain("legalName: LEGAL_OPERATOR_NAME");
    expect(productMeta).toContain("priceCurrency");
  });

  it("documents one marketplace/intermediary seller-of-record principle across buyer legal surfaces", () => {
    for (const source of [terms, buyerTerms, returns, shipping]) {
      expect(source).toMatch(/independent seller|independent supplier/i);
      expect(source).not.toMatch(/Loadify is the seller and merchant of record/i);
      expect(source).not.toMatch(/Loadify remains the buyer's customer-facing seller/i);
      expect(source).not.toMatch(/sold by Loadify/i);
    }
    expect(terms).toContain("does not own marketplace inventory");
    expect(buyerTerms).toContain("does not own or pre-purchase the goods");
    expect(returns).toContain("does not become the owner or seller of the goods");
    expect(shipping).toContain("Supplier-held stock does not become Loadify inventory");
  });

  it("keeps Loadify's role as marketplace operator without denying its own platform obligations", () => {
    expect(terms).toContain("Loadify provides marketplace technology");
    expect(terms).toContain("remains responsible for its own platform acts");
    expect(buyerTerms).toContain("Loadify remains responsible for its own marketplace-platform acts");
  });

  it("does not market the catalogue as verified UK sellers only", () => {
    for (const source of [indexHtml, buyerHowItWorks, onboarding]) {
      expect(source).not.toMatch(/verified UK sellers/i);
    }
    expect(indexHtml).toContain("approved supplier marketplace products");
    expect(buyerHowItWorks).toContain("approved suppliers");
    expect(onboarding).toContain("approved suppliers");
  });

  it("keeps transactional order messaging aligned with independent seller/supplier responsibility", () => {
    expect(email).toContain("Marketplace Seller orders are sold and fulfilled by the independent seller");
    expect(email).toContain("Approved Supplier Marketplace orders are sold and fulfilled by the independent supplier");
    expect(email).toContain("it does not own the goods");
    expect(email).not.toContain("Loadify Supplier-Fulfilled orders are sold by Loadify Market");
  });
});
