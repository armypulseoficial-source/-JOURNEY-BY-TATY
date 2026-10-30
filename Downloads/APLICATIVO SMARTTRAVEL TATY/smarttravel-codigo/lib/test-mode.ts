// Test mode utilities for testing without Supabase authentication

export const TEST_USERS = {
  'taty-teste': {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'teste.taty@example.com',
    full_name: 'Taty (Teste)',
    organization_id: '20000000-0000-0000-0000-000000000001', // ARMY Pulse org
    role: 'agency_admin' as const,
  },
  'gabi-diniz': {
    id: '10000000-0000-0000-0000-000000000002',
    email: 'gabi.diniz.medeiros@gmail.com',
    full_name: 'Gabi Diniz',
    organization_id: '20000000-0000-0000-0000-000000000001',
    role: 'traveler' as const,
  },
  'heitor-sky': {
    id: '10000000-0000-0000-0000-000000000003',
    email: 'heitorsky@gmail.com',
    full_name: 'Heitor Sky',
    organization_id: '20000000-0000-0000-0000-000000000001',
    role: 'traveler' as const,
  },
};

export function getTestUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('test_user_id');
}

export function getTestUser(userId: string) {
  return Object.values(TEST_USERS).find((u) => u.id === userId);
}

export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem('test_user_id');
}

export function clearTestMode(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('test_user_id');
  }
}
