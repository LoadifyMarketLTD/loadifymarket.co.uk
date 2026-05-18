import { describe, expect, it } from "vitest";
import { parseConversationRouteSearch } from "@/lib/routeSearch";

describe("parseConversationRouteSearch", () => {
  it("parses regular seller messages query params", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123&offerId=offer-456")).toEqual({
      conversationId: "conv-123",
      offerId: "offer-456",
    });
  });

  it("parses HTML-encoded ampersand params from notification deep links", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123&amp;offerId=offer-456")).toEqual({
      conversationId: "conv-123",
      offerId: "offer-456",
    });
  });

  it("parses percent-encoded '&amp;' params from malformed redirects", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123%26amp%3BofferId%3Doffer-456")).toEqual({
      conversationId: "conv-123",
      offerId: "offer-456",
    });
  });
});
