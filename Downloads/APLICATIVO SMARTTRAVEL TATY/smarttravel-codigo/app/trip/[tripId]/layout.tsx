import type { ReactNode } from 'react';
import { TripSync } from '@/components/offline/trip-sync';
import { SairButton } from '@/components/auth/sair-button';

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TripSync />
      <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem' }}>
        <SairButton />
      </header>
      {children}
    </>
  );
}
