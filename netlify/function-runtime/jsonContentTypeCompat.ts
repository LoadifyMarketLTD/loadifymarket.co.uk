export function ensureJsonContentType(response: Response): Response {
  const contentType = response.headers.get('content-type')?.trim();
  if (contentType) return response;

  response.headers.set('content-type', 'application/json; charset=utf-8');
  return response;
}
