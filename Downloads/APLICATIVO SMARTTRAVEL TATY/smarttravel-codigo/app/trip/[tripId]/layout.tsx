import type { ReactNode } from 'react';
import { TripSync } from '@/components/offline/trip-sync';

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TripSync />
      {children}
    </>
  );
}
