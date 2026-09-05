export function ensureJsonContentType(response: Response): Response {
  const contentType = response.headers.get('content-type')?.trim();
  if (contentType) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
