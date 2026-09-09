import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const buyerSettings = read("src/pages/pixel-perfect/buyer/BuyerSettings.tsx");
const sellerSettings = read("src/pages/pixel-perfect/seller/SellerSettings.tsx");
const privacyWeb = read("src/pages/pixel-perfect/PrivacyPolicyWeb.tsx");
const privacyMobile = read("src/pages/pixel-perfect/PrivacyPolicyMobile.tsx");
const androidGradle = read("android/app/build.gradle");
const deleteAccount = read("netlify/functions/delete-account.ts");
const deleteAccountPage = read("src/pages/pixel-perfect/DeleteAccount.tsx");

describe("Google Play account deletion compliance contract", () => {
  it("uses the real authenticated deletion endpoint from both account settings surfaces", () => {
    for (const source of [buyerSettings, sellerSettings]) {
      expect(source).toContain('authorizedFetch("/.netlify/functions/delete-account"');
      expect(source).toContain('method: "DELETE"');
      expect(source).not.toContain('authorizedFetch("/.netlify/functions/deactivate-account"');
      expect(source).toContain("This permanently deletes your Loadify account");
    }
  });

  it("keeps the public privacy policy aligned with the Play Data Safety declaration", () => {
    for (const policy of [privacyWeb, privacyMobile]) {
      expect(policy).toContain("9 September 2026");
      expect(policy).toContain("push-notification tokens or device identifiers");
      expect(policy).toContain("crash/error diagnostic information");
      expect(policy).toContain("proof-of-delivery files");
      expect(policy).toContain("wishlist/favourite actions");
      expect(policy).toContain('href="/delete-account"');
    }
  });

  it("removes non-retained account data before deleting authentication", () => {
    for (const table of ["carts", "wishlists", "saved_searches", "notifications", "notification_settings", "reviews", "product_questions", "product_offers", "conversations", "user_blocks", "push_tokens"]) {
      expect(deleteAccount).toContain(`from('${table}')`);
    }
    expect(deleteAccount).toContain("removeSellerProductMedia");
    expect(deleteAccount).toContain("images: []");
    expect(deleteAccount).toContain("auth.admin.deleteUser(targetUserId)");
    expect(deleteAccountPage).toContain("remove reviews and non-transaction marketplace conversations");
  });

  it("bumps the Android compliance bundle version code", () => {
    expect(androidGradle).toContain("versionCode 3");
  });
});
