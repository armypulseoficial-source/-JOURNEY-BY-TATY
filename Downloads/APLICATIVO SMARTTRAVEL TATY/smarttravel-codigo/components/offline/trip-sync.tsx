'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { syncTrip } from '@/lib/offline/sync';

// Sincroniza a viagem aberta ao abrir a tela e de novo ao reconectar.
export function TripSync() {
  const { tripId } = useParams<{ tripId: string }>();

  useEffect(() => {
    if (!tripId) return;
    const sincronizar = () => {
      void syncTrip(tripId);
    };
    sincronizar();
    window.addEventListener('online', sincronizar);
    return () => window.removeEventListener('online', sincronizar);
  }, [tripId]);

  return null;
}
