// ============================================================================
// functions/api/[[path]].js - Cloudflare Pages Functions Adapter
// ============================================================================

import { handleFetchApi } from '../../server/api.js';

export async function onRequest(context) {
  return handleFetchApi(context.request, context.env);
}
