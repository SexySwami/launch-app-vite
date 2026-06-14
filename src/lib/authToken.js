// Module-level token getter so any non-React module can get the current
// Clerk session token without needing hooks or prop drilling.
// App.jsx registers the getter once on mount via registerTokenGetter().

let _getToken = null;

export function registerTokenGetter(fn) {
  _getToken = fn;
}

export async function getBearerToken() {
  if (!_getToken) return null;
  try {
    return await _getToken();
  } catch {
    return null;
  }
}
