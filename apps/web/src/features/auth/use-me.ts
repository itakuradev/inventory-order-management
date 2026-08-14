'use client';

import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@logimaster/contracts';
import { apiRequest } from '@/lib/api-client';
import { useAuthenticatedDemoUserKey } from './demo-session';

export function useMe() {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['me', demoUserKey],
    queryFn: () => apiRequest<MeResponse>(demoUserKey, '/me'),
  });
}
