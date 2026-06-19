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

const INTERNAL_EMAILS = new Set([
  'swami.kush@gmail.com',
  'kushyegnaswami@gmail.com',
]);

// Tie all future events to the signed-in user.
export function identifyUser(userId, email) {
  if (!KEY) return;
  const props = { $email: email };
  if (email && INTERNAL_EMAILS.has(email)) props.$internal_or_test_user = true;
  posthog.identify(userId, props);
}

// Reset PostHog on sign-out so the next account gets a fresh anonymous ID.
// Without this, signing into a different account on the same browser merges
// the new Clerk user ID into the previous person profile, collapsing all
// test accounts into one PostHog person.
export function resetAnalytics() {
  if (!KEY) return;
  posthog.reset();
}

// Fire a named event with optional properties.
export function track(event, props = {}) {
  if (!KEY) return;
  posthog.capture(event, props);
}
