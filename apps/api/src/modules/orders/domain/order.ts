import { ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from '@logimaster/contracts';
import { InvalidOrderStatusTransitionError } from './order-errors';
import { canTransition } from './order-status';
import type { OrderQuantity } from './order-quantity';

/** 登録時に在庫引当まで完了させるため、作成直後のOrderは必ずALLOCATEDになる。 */
export const INITIAL_ORDER_STATUS: OrderStatus = ORDER_STATUS.ALLOCATED;

export type OrderDraftItem = {
  productId: string;
  quantity: OrderQuantity;
};

/** 永続化前の出荷オーダー。IDとOrderItemのIDは永続化時に採番する。 */
export type OrderDraft = {
  organizationId: string;
  shipperId: string;
  orderNumber: string;
  destinationName: string;
  destinationAddress: string;
  requestedShipDate: Date;
  status: OrderStatus;
  createdByUserId: string;
  items: OrderDraftItem[];
};

export type PersistedOrderItem = {
  id: string;
  productId: string;
  quantity: number;
};

export type PersistedOrder = {
  id: string;
  orderNumber: string;
  items: PersistedOrderItem[];
};

type OrderProps = {
  id: string;
  organizationId: string;
  orderNumber: string;
  status: OrderStatus;
};

/**
 * 出荷オーダー。
 * ステータス変更はこのEntityのメソッドのみを経由し、他の層で直接書き換えない。
 */
export class Order {
  private constructor(
    readonly id: string,
    readonly organizationId: string,
    readonly orderNumber: string,
    private currentStatus: OrderStatus,
  ) {}

  static reconstruct(props: OrderProps): Order {
    return new Order(props.id, props.organizationId, props.orderNumber, props.status);
  }

  get status(): OrderStatus {
    return this.currentStatus;
  }

  get isAllocated(): boolean {
    return this.currentStatus === ORDER_STATUS.ALLOCATED;
  }

  /** 後続の出荷工程へ引き渡す。引当は維持し、在庫数量は変更しない。 */
  handOver(): void {
    this.transitionTo(ORDER_STATUS.HANDED_OVER);
  }

  /** キャンセルする。引当解除と在庫の戻しはApplication層が同一Transactionで行う。 */
  cancel(): void {
    this.transitionTo(ORDER_STATUS.CANCELLED);
  }

  private transitionTo(next: OrderStatus): void {
    if (!canTransition(this.currentStatus, next)) {
      throw new InvalidOrderStatusTransitionError(
        `${ORDER_STATUS_LABEL[this.currentStatus]}の出荷オーダーを${ORDER_STATUS_LABEL[next]}へ変更することはできません`,
      );
    }
    this.currentStatus = next;
  }
}
