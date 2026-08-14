'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdjustInventoryRequest,
  InventoryView,
  ListInventoriesQuery,
  Paginated,
} from '@logimaster/contracts';
import { useAuthenticatedDemoUserKey } from '@/features/auth/demo-session';
import { apiRequest } from '@/lib/api-client';

export type InventoryListParams = Partial<
  Pick<ListInventoriesQuery, 'keyword' | 'shipperName'>
> &
  Pick<ListInventoriesQuery, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>;

export function useInventories(params: InventoryListParams) {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['inventories', demoUserKey, params],
    queryFn: () =>
      apiRequest<Paginated<InventoryView>>(demoUserKey, '/inventories', { searchParams: params }),
  });
}

export function useAdjustInventory() {
  const demoUserKey = useAuthenticatedDemoUserKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      request,
    }: {
      inventoryId: string;
      request: AdjustInventoryRequest;
    }) =>
      apiRequest<void>(demoUserKey, `/inventories/${inventoryId}/adjustments`, {
        method: 'POST',
        body: request,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
}
