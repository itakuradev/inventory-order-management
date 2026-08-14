'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateOrderRequest,
  ListOrdersQuery,
  OrderDetail,
  OrderSummary,
  Paginated,
} from '@logimaster/contracts';
import { useAuthenticatedDemoUserKey } from '@/features/auth/demo-session';
import { apiRequest } from '@/lib/api-client';

/** 画面が保持する検索条件。未入力の項目はAPIへ送らない。 */
export type OrderListParams = Partial<Pick<ListOrdersQuery, 'orderNumber' | 'shipperName' | 'status'>> &
  Pick<ListOrdersQuery, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>;

export function useOrders(params: OrderListParams) {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['orders', demoUserKey, params],
    queryFn: () =>
      apiRequest<Paginated<OrderSummary>>(demoUserKey, '/orders', { searchParams: params }),
  });
}

export function useOrderDetail(orderId: string) {
  const demoUserKey = useAuthenticatedDemoUserKey();

  return useQuery({
    queryKey: ['order', demoUserKey, orderId],
    queryFn: () => apiRequest<OrderDetail>(demoUserKey, `/orders/${orderId}`),
  });
}

export function useCreateOrder() {
  const demoUserKey = useAuthenticatedDemoUserKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateOrderRequest) =>
      apiRequest<OrderDetail>(demoUserKey, '/orders', { method: 'POST', body: request }),
    onSuccess: () => {
      // 登録により在庫の引当済数量も変わるため、あわせて再取得する。
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
}

export function useCancelOrder(orderId: string) {
  const demoUserKey = useAuthenticatedDemoUserKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<void>(demoUserKey, `/orders/${orderId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', demoUserKey, orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['inventories'] });
    },
  });
}

export function useHandOverOrder(orderId: string) {
  const demoUserKey = useAuthenticatedDemoUserKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<void>(demoUserKey, `/orders/${orderId}/hand-over`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', demoUserKey, orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
