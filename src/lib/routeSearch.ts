export function parseConversationRouteSearch(search: string) {
  let normalized = search;
  try {
    normalized = decodeURIComponent(search);
  } catch {
    normalized = search;
  }
  normalized = normalized.replace(/&amp;/gi, "&");
  const params = new URLSearchParams(normalized.startsWith("?") ? normalized.slice(1) : normalized);
  const rawConversationId = params.get("conversationId");
  const conversationId = rawConversationId ? rawConversationId.split("&")[0].trim() : null;
  return {
    conversationId: conversationId || null,
  };
}
