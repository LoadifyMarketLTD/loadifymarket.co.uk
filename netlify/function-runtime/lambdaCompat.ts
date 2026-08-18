import type { Handler, HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions';

const textContentTypes = new Set([
  'application/csp-report',
  'application/graphql',
  'application/json',
  'application/javascript',
  'application/x-www-form-urlencoded',
  'application/x-ndjson',
  'application/xml',
]);

function shouldBase64Encode(contentType: string): boolean {
  if (!contentType) return true;

  const [contentTypeSegment] = contentType.split(';');
  const normalized = contentTypeSegment.toLowerCase();

  if (normalized.startsWith('text/')) return false;
  if (normalized.endsWith('+json') || normalized.endsWith('+xml')) return false;
  return !textContentTypes.has(normalized);
}

async function buildEventFromRequest(request: Request): Promise<HandlerEvent> {
  const url = new URL(request.url);
  const queryStringParameters: Record<string, string> = {};
  const multiValueQueryStringParameters: Record<string, string[]> = {};

  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
    multiValueQueryStringParameters[key] = [
      ...(multiValueQueryStringParameters[key] ?? []),
      value,
    ];
  });

  const headers: Record<string, string> = {};
  const multiValueHeaders: Record<string, string[]> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
    multiValueHeaders[key] = value.split(',').map((entry) => entry.trim());
  });

  const contentType = request.headers.get('content-type') ?? '';
  const isBinary = shouldBase64Encode(contentType);
  let body: string | null = null;
  let isBase64Encoded = false;

  if (request.body) {
    if (isBinary) {
      const buffer = await request.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binaryString = '';
      for (const byte of bytes) binaryString += String.fromCharCode(byte);
      body = btoa(binaryString);
      isBase64Encoded = true;
    } else {
      body = await request.text();
    }
  }

  return {
    rawUrl: url.toString(),
    rawQuery: url.search.replace(/^\?/, ''),
    path: url.pathname,
    httpMethod: request.method,
    headers,
    multiValueHeaders,
    queryStringParameters:
      Object.keys(queryStringParameters).length > 0 ? queryStringParameters : null,
    multiValueQueryStringParameters:
      Object.keys(multiValueQueryStringParameters).length > 0
        ? multiValueQueryStringParameters
        : null,
    body,
    isBase64Encoded,
  } as HandlerEvent;
}

function buildLambdaContext(context: { requestId?: string }): HandlerContext {
  return {
    awsRequestId: context.requestId ?? '',
    callbackWaitsForEmptyEventLoop: true,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    memoryLimitInMB: '',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 0,
    done: () => {
      throw new Error('context.done() is not supported in modern Netlify Functions');
    },
    fail: () => {
      throw new Error('context.fail() is not supported in modern Netlify Functions');
    },
    succeed: () => {
      throw new Error('context.succeed() is not supported in modern Netlify Functions');
    },
  } as HandlerContext;
}

function buildResponseFromResult(result: HandlerResponse | void): Response {
  if (!result) return new Response(null, { status: 204 });

  const headers = new Headers();
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) {
      if (value != null) headers.set(name.toLowerCase(), value.toString());
    }
  }

  if (result.multiValueHeaders) {
    for (const [name, values] of Object.entries(result.multiValueHeaders)) {
      for (const value of values) headers.append(name.toLowerCase(), value.toString());
    }
  }

  let body: BodyInit | null = null;
  if (result.body != null) {
    if (result.isBase64Encoded) {
      const binaryString = atob(result.body);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }
      body = bytes;
    } else {
      body = result.body;
    }
  }

  return new Response(body, {
    status: result.statusCode,
    headers,
  });
}

export function withLambda(handler: Handler) {
  return async (request: Request, context: { requestId?: string }): Promise<Response> => {
    const event = await buildEventFromRequest(request);
    const lambdaContext = buildLambdaContext(context);
    const result = await handler(event, lambdaContext);
    return buildResponseFromResult(result);
  };
}
