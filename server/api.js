// ============================================================================
// server/api.js - Universal API Request Handler (/api/store)
// ============================================================================

import { getStore, updateStore } from './store-service.js';

/**
 * Handle Node.js IncomingMessage & ServerResponse (Vite dev middleware)
 */
export async function handleNodeApi(req, res, env = {}) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Helper untuk membaca request body JSON
  async function readJsonBody() {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        if (!body) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Format JSON tidak valid.'));
        }
      });
      req.on('error', reject);
    });
  }

  // Helper untuk mengirim JSON response
  function sendJson(status, data, extraHeaders = {}) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      ...extraHeaders
    });
    res.end(JSON.stringify(data));
  }

  const canEdit = true;

  try {
    // 1. GET /api/store
    if (pathname === '/api/store' && req.method === 'GET') {
      const result = await getStore(canEdit, env);
      return sendJson(200, result);
    }

    // 2. POST /api/store
    if (pathname === '/api/store' && req.method === 'POST') {
      const body = await readJsonBody();
      const result = await updateStore(body, canEdit, env);
      return sendJson(200, result);
    }

    // Not Found
    return sendJson(404, { error: `Endpoint tidak ditemukan: ${pathname}` });
  } catch (err) {
    const status = err.status || 500;
    return sendJson(status, {
      error: err.message || 'Terjadi kesalahan server.',
      currentRevision: err.currentRevision
    });
  }
}

/**
 * Handle Standard Fetch Request (Cloudflare Pages Functions / Workers)
 */
export async function handleFetchApi(request, env = {}) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const canEdit = true;

  try {
    // 1. GET /api/store
    if (pathname === '/api/store' && request.method === 'GET') {
      const result = await getStore(canEdit, env);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. POST /api/store
    if (pathname === '/api/store' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const result = await updateStore(body, canEdit, env);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: `Endpoint tidak ditemukan: ${pathname}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const status = err.status || 500;
    return new Response(JSON.stringify({
      error: err.message || 'Terjadi kesalahan server.',
      currentRevision: err.currentRevision
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
