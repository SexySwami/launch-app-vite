// Helpers for scheduling break alarm notifications via the service worker.
// The SW uses setTimeout + showNotification, which fires even when the tab
// is backgrounded on Android. On iOS the SW may be suspended when locked —
// the alarm will fire as soon as the user unlocks.

let swRegistration = null;

export async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.ready;
  } catch {}
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export function scheduleBreakAlarm(endsAt) {
  const reg = swRegistration;
  if (!reg?.active) return;
  const delayMs = Math.max(0, endsAt - Date.now());
  reg.active.postMessage({
    type: 'SCHEDULE_ALARM',
    delayMs,
    title: 'Break is over!',
    body: 'Launch is ready when you are.',
  });
}

export function cancelBreakAlarm() {
  swRegistration?.active?.postMessage({ type: 'CANCEL_ALARM' });
}

// True on iOS Safari (PWA or browser). Used to show a caveat banner.
export function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
}
