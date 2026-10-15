'use client';

import { useEffect } from 'react';

// Registra /sw.js (escopo "/"). Sem Service Worker o app segue funcionando online.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((erro: unknown) => {
      console.warn('Service Worker não registrado; o app segue online.', erro);
    });
  }, []);

  return null;
}
