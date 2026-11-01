// ============================================================================
// server/api.js - Universal API Request Handler (/api/store & /api/owner)
// ============================================================================

import { authenticateOwner, isOwnerAuthenticated, lockOwnerSession } from './owner-auth.js';
import { getStore, updateStore } from './store-service.js';

/**
 * Handle Node.js IncomingMessage & ServerResponse (Vite dev middleware)
 */
export async function handleNodeApi(req, res, env = {}) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || Boolean(req.connection?.encrypted);
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

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

  const canEdit = isOwnerAuthenticated(req, env);

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

    // 3. POST or DELETE /api/owner
    if (pathname === '/api/owner' && (req.method === 'POST' || req.method === 'DELETE')) {
      const body = req.method === 'DELETE' ? { action: 'logout' } : await readJsonBody();

      if (body.action === 'logout' || body.action === 'lock') {
        const lockRes = lockOwnerSession(isHttps);
        return sendJson(200, { success: true, canEdit: false }, {
          'Set-Cookie': lockRes.cookieHeader
        });
      }

      const authRes = authenticateOwner(body.code, clientIp, isHttps, env);
      if (!authRes.success) {
        return sendJson(authRes.status || 401, { error: authRes.error, canEdit: false });
      }

      return sendJson(200, { success: true, canEdit: true, token: authRes.token }, {
        'Set-Cookie': authRes.cookieHeader
      });
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
  const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  const reqWrapper = {
    headers: {
      cookie: request.headers.get('cookie') || '',
      authorization: request.headers.get('authorization') || '',
      'x-owner-token': request.headers.get('x-owner-token') || '',
      'x-owner-code': request.headers.get('x-owner-code') || ''
    }
  };

  const canEdit = isOwnerAuthenticated(reqWrapper, env);

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

    // 3. POST or DELETE /api/owner
    if (pathname === '/api/owner' && (request.method === 'POST' || request.method === 'DELETE')) {
      const body = request.method === 'DELETE' ? { action: 'logout' } : await request.json().catch(() => ({}));

      if (body.action === 'logout' || body.action === 'lock') {
        const lockRes = lockOwnerSession(isHttps);
        return new Response(JSON.stringify({ success: true, canEdit: false }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': lockRes.cookieHeader
          }
        });
      }

      const authRes = authenticateOwner(body.code, clientIp, isHttps, env);
      if (!authRes.success) {
        return new Response(JSON.stringify({ error: authRes.error, canEdit: false }), {
          status: authRes.status || 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, canEdit: true, token: authRes.token }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': authRes.cookieHeader
        }
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
