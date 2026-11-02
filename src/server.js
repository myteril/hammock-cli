'use strict';

const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const BODY_LIMIT = 1024 * 1024;
const ALLOWED_METHODS = 'GET, POST, PUT, OPTIONS';
const SERVING_METHODS = new Set(['GET', 'POST', 'PUT']);
const ERROR_MESSAGES = {
  400: 'Bad request.',
  404: 'Not found.',
  405: 'Method not allowed.',
  413: 'Payload too large.',
  500: 'Internal server error.'
};
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const RAW_UNSAFE_SEQUENCE = /%(?:2f|5c|00)/i;
const HEADER_LIST = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+(?:[ \t]*,[ \t]*[!#$%&'*+\-.^_`|~0-9A-Za-z]+)*$/;

function allowHeaders(req) {
  const requested = req.headers['access-control-request-headers'];
  if (
    typeof requested === 'string' &&
    requested.length <= 1024 &&
    HEADER_LIST.test(requested)
  ) {
    return requested;
  }
  return undefined;
}

function requestOrigin(req) {
  const rawHeaders = req && req.rawHeaders;
  if (!Array.isArray(rawHeaders)) {
    return undefined;
  }

  let count = 0;
  let origin;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    if (typeof name === 'string' && name.toLowerCase() === 'origin') {
      count += 1;
      origin = rawHeaders[index + 1];
    }
  }

  if (count !== 1 || typeof origin !== 'string') {
    return undefined;
  }
  if (origin.length === 0 || origin.length > 1024) {
    return undefined;
  }
  if (/\s/.test(origin) || origin.includes(',') || CONTROL_CHARACTERS.test(origin)) {
    return undefined;
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }
  if (parsed.origin !== origin) {
    return undefined;
  }

  return origin;
}

function responseHeaders(req) {
  const headers = {
    'Cache-Control': 'no-store',
    'Vary': 'Origin, Access-Control-Request-Headers',
    'X-Content-Type-Options': 'nosniff'
  };

  const origin = requestOrigin(req);
  if (origin !== undefined && req.headers) {
    const allowedHeaders = allowHeaders(req);
    if (allowedHeaders !== undefined) {
      headers['Access-Control-Allow-Headers'] = allowedHeaders;
    }
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = ALLOWED_METHODS;
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function sendJson(res, status, message, headers, extraHeaders = {}) {
  if (res.writableEnded || res.destroyed) {
    return;
  }
  if (res.headersSent) {
    res.end();
    return;
  }

  const body = Buffer.from(JSON.stringify({ error: message }));
  res.writeHead(status, {
    ...headers,
    ...extraHeaders,
    'Content-Length': body.length,
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(body);
}

function sendError(res, status, headers, extraHeaders) {
  sendJson(res, status, ERROR_MESSAGES[status] || 'Request failed.', headers, extraHeaders);
}

function sendNoContent(res, headers, extraHeaders = {}) {
  if (res.writableEnded || res.destroyed) {
    return;
  }
  if (res.headersSent) {
    res.end();
    return;
  }

  res.writeHead(204, { ...headers, ...extraHeaders });
  res.end();
}

function closeWhenDone(req, res) {
  res.once('finish', () => {
    if (!req.destroyed) {
      req.destroy();
    }
  });
}

function declaredTooLarge(req) {
  const declared = req.headers['content-length'];
  if (declared === undefined) {
    return false;
  }
  const length = Number(declared);
  return Number.isFinite(length) && length > BODY_LIMIT;
}

function drainBody(req) {
  if (req.readableEnded) {
    return Promise.resolve('complete');
  }

  return new Promise((resolve) => {
    let received = 0;
    let settled = false;

    function cleanup() {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    }

    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(result);
    }

    function onData(chunk) {
      received += chunk.length;
      if (received > BODY_LIMIT) {
        req.pause();
        finish('overflow');
      }
    }

    function onEnd() {
      finish('complete');
    }

    function onError() {
      finish('aborted');
    }

    function onAborted() {
      finish('aborted');
    }

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', onAborted);
  });
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function parseRequestPath(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return { status: 404 };
  }

  const queryIndex = rawUrl.indexOf('?');
  const rawPath = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  if (!rawPath.startsWith('/') || rawPath === '/' || rawPath.endsWith('/')) {
    return { status: 404 };
  }
  if (RAW_UNSAFE_SEQUENCE.test(rawPath) || CONTROL_CHARACTERS.test(rawPath)) {
    return { status: 404 };
  }

  const rawSegments = rawPath.slice(1).split('/');
  if (rawSegments.some((segment) => segment === '')) {
    return { status: 404 };
  }

  let segments;
  try {
    segments = rawSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    return { status: 400 };
  }

  for (const segment of segments) {
    if (
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes(':') ||
      CONTROL_CHARACTERS.test(segment) ||
      /[. ]$/.test(segment)
    ) {
      return { status: 404 };
    }
  }

  const lastIndex = segments.length - 1;
  if (segments[lastIndex].endsWith('.json')) {
    return { status: 404 };
  }

  segments[lastIndex] += '.json';
  return { status: 200, segments };
}

function statusForError(error) {
  if (
    error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'ELOOP')
  ) {
    return 404;
  }
  return 500;
}

async function locateTarget(realRoot, rawUrl) {
  const parsed = parseRequestPath(rawUrl);
  if (parsed.status !== 200) {
    return parsed;
  }

  const candidate = path.resolve(realRoot, ...parsed.segments);
  if (!isInside(realRoot, candidate)) {
    return { status: 404 };
  }

  let target;
  try {
    target = await fs.promises.realpath(candidate);
  } catch (error) {
    return { status: statusForError(error) };
  }

  if (!isInside(realRoot, target)) {
    return { status: 404 };
  }

  try {
    const info = await fs.promises.stat(target);
    if (!info.isFile()) {
      return { status: 404 };
    }
  } catch (error) {
    return { status: statusForError(error) };
  }

  return { status: 200, target };
}

function createServer({ rootDir, https: useHttps, cert, key } = {}) {
  const realRoot = fs.realpathSync(path.resolve(rootDir));
  if (!fs.statSync(realRoot).isDirectory()) {
    throw new Error('The root must be a directory.');
  }

  const handler = async (req, res) => {
    const headers = responseHeaders(req);

    try {
      if (req.method === 'OPTIONS') {
        sendNoContent(res, headers, { Connection: 'close' });
        closeWhenDone(req, res);
        return;
      }

      if (!SERVING_METHODS.has(req.method)) {
        sendError(res, 405, headers, {
          Allow: ALLOWED_METHODS,
          Connection: 'close'
        });
        closeWhenDone(req, res);
        return;
      }

      if (declaredTooLarge(req)) {
        sendError(res, 413, headers, { Connection: 'close' });
        closeWhenDone(req, res);
        return;
      }

      const bodyState = await drainBody(req);
      if (bodyState === 'aborted') {
        return;
      }
      if (bodyState === 'overflow') {
        sendError(res, 413, headers, { Connection: 'close' });
        closeWhenDone(req, res);
        return;
      }

      const resolved = await locateTarget(realRoot, req.url);
      if (resolved.status !== 200) {
        sendError(res, resolved.status, headers);
        return;
      }

      let body;
      try {
        body = await fs.promises.readFile(resolved.target);
      } catch (error) {
        sendError(res, statusForError(error), headers);
        return;
      }

      if (res.writableEnded || res.destroyed) {
        return;
      }
      res.writeHead(200, {
        ...headers,
        'Content-Length': body.length,
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(body);
    } catch {
      sendError(res, 500, headers);
    }
  };

  if (useHttps) {
    if (!cert || !key) {
      throw new Error('HTTPS requires a certificate and key.');
    }
    return https.createServer({ cert, key }, handler);
  }
  return http.createServer(handler);
}

module.exports = createServer;
module.exports.createServer = createServer;