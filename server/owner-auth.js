// ============================================================================
// server/owner-auth.js - Owner Authentication Handling (Bypassed for Direct Use)
// ============================================================================

export function isOwnerAuthenticated() {
  return true;
}

export function authenticateOwner() {
  return {
    success: true,
    token: "direct-access",
    cookieHeader: ""
  };
}

export function lockOwnerSession() {
  return {
    success: true,
    cookieHeader: ""
  };
}

export function parseCookies() {
  return {};
}

export function signSession() {
  return "";
}

export function verifySession() {
  return { role: "owner" };
}
