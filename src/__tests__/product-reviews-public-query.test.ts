import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/product/ProductReviews.tsx"),
  "utf8",
);

describe("public product reviews query", () => {
  it("does not join the protected users table from the anonymous product page", () => {
    expect(source).toContain('.from("reviews")');
    expect(source).toContain("helpfulCount, helpfulVoters, createdAt, userId");
    expect(source).not.toContain("users(firstName, lastName)");
    expect(source).not.toContain("review.users?.");
  });

  it("uses a privacy-safe public author label without requiring user profile access", () => {
    expect(source).toContain('const authorName = "Buyer";');
  });
});