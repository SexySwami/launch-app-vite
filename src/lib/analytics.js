import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;

// Init once. No-ops silently if the key isn't set (local dev without .env.local).
export function initAnalytics() {
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false, // SPA — we'll track screens manually if needed
    persistence: 'localStorage',
    // Always create person profiles so funnel queries include all events,
    // even on the first render cycle before identify() is called.
    person_profiles: 'always',
  });
}

// Tie all future events to the signed-in user.
export function identifyUser(userId) {
  if (!KEY) return;
  posthog.identify(userId);
}

// Fire a named event with optional properties.
export function track(event, props = {}) {
  if (!KEY) return;
  posthog.capture(event, props);
}
