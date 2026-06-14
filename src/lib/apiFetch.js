// Drop-in replacement for fetch() that automatically attaches the current
// user's Clerk Bearer token to every request. Import apiFetch and use it
// exactly like fetch — same signature, same return value.

import { getBearerToken } from './authToken.js';

export async function apiFetch(url, options = {}) {
  const token = await getBearerToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}
