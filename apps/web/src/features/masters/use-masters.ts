'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductView, ShipperView } from '@logimaster/contracts';
import { useAuthenticatedDemoUserKey } from '@/features/auth/demo-session';
import { apiRequest } from '@/lib/api-client';

export function useShippers() {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['shippers', demoUserKey],
    queryFn: () => apiRequest<ShipperView[]>(demoUserKey, '/shippers'),
  });
}

export function useProductsOfShipper(shipperId: string) {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['products', demoUserKey, shipperId],
    queryFn: () => apiRequest<ProductView[]>(demoUserKey, '/products', { searchParams: { shipperId } }),
    enabled: shipperId !== '',
  });
}
