import { describe, expect, it } from "vitest";
import {
  formatUkPostcode,
  normalizeDeliveryAddress,
  validateDeliveryAddress,
} from "@/lib/deliveryAddress";

describe("delivery address validation", () => {
  it("formats and accepts valid UK postcodes", () => {
    expect(formatUkPostcode("bb19ql")).toBe("BB1 9QL");
    expect(formatUkPostcode("SW1A2AA")).toBe("SW1A 2AA");
    expect(validateDeliveryAddress({
      name: "Daniel Preda",
      line1: "101 Cornelian Street",
      city: "Blackburn",
      postcode: "BB1 9QL",
    })).toBeNull();
  });

  it("rejects incomplete or invalid delivery addresses", () => {
    expect(validateDeliveryAddress({
      name: "",
      line1: "101 Cornelian Street",
      city: "Blackburn",
      postcode: "BB1 9QL",
    })).toContain("full name");
    expect(validateDeliveryAddress({
      name: "Daniel Preda",
      line1: "101 Cornelian Street",
      city: "Blackburn",
      postcode: "INVALID",
    })).toContain("valid UK postcode");
  });

  it("normalizes the persisted country contract", () => {
    expect(normalizeDeliveryAddress({
      name: " Daniel Preda ",
      line1: " 101 Cornelian Street ",
      city: " Blackburn ",
      postcode: "bb19ql",
      country: "free text",
    })).toMatchObject({
      name: "Daniel Preda",
      line1: "101 Cornelian Street",
      city: "Blackburn",
      postcode: "BB1 9QL",
      country: "United Kingdom",
      countryCode: "GB",
    });
  });
});
