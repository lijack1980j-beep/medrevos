'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // In local/dev, stale cached HTML is more harmful than helpful.
    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
        .catch(() => {});

      if ('caches' in window) {
        caches.keys()
          .then(keys => Promise.all(keys.filter(key => key.startsWith('medrevision-')).map(key => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
