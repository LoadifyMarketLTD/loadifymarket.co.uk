import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

const DEFAULT_ORIGIN = 'https://loadifymarket.co.uk';

export function getAllowedOrigin(): string {
  return process.env.VITE_APP_URL || process.env.URL || DEFAULT_ORIGIN;
}

export function buildCorsHeaders(methods: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonHeaders(methods: string): Record<string, string> {
  return { ...buildCorsHeaders(methods), 'Content-Type': 'application/json' };
}

export function optionsResponse(methods: string): HandlerResponse {
  return {
    statusCode: 204,
    headers: buildCorsHeaders(methods),
    body: '',
  };
}

export function jsonResponse(statusCode: number, body: unknown, methods: string): HandlerResponse {
  return {
    statusCode,
    headers: jsonHeaders(methods),
    body: JSON.stringify(body),
  };
}

export function getBearerToken(event: HandlerEvent): string | null {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
