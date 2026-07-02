import { describe, expect, it } from "vitest";
import { parseConversationRouteSearch } from "@/lib/routeSearch";

describe("parseConversationRouteSearch", () => {
  it("parses regular seller messages query params", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123")).toEqual({
      conversationId: "conv-123",
    });
  });

  it("parses HTML-encoded ampersand params from notification deep links", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123&amp;foo=bar")).toEqual({
      conversationId: "conv-123",
    });
  });

  it("parses percent-encoded '&amp;' params from malformed redirects", () => {
    expect(parseConversationRouteSearch("?conversationId=conv-123%26amp%3Bfoo%3Dbar")).toEqual({
      conversationId: "conv-123",
    });
  });
});
