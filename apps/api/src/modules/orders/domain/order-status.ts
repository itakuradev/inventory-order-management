import { ORDER_STATUS, type OrderStatus } from '@logimaster/contracts';

/**
 * 許可する状態遷移。
 *
 *   ALLOCATED → HANDED_OVER
 *   ALLOCATED → CANCELLED
 *
 * 後続工程へ引き渡した後のキャンセル（HANDED_OVER → CANCELLED）は許可しない。
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.ALLOCATED]: [ORDER_STATUS.HANDED_OVER, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.HANDED_OVER]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
