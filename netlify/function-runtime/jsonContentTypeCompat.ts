export function ensureJsonContentType(response: Response): Response {
  response.headers.set('content-type', 'application/json; charset=utf-8');
  return response;
}
