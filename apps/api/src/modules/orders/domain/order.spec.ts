import { ORDER_STATUS, type OrderStatus } from '@logimaster/contracts';
import { Order } from './order';
import { InvalidOrderQuantityError, InvalidOrderStatusTransitionError } from './order-errors';
import { OrderQuantity } from './order-quantity';

function createOrder(status: OrderStatus): Order {
  return Order.reconstruct({
    id: 'ord-1',
    organizationId: 'org-1',
    orderNumber: 'SO-TEST',
    status,
  });
}

describe('Order', () => {
  describe('許可された状態遷移', () => {
    it('引当済から引き渡し済へ変更できる', () => {
      const order = createOrder(ORDER_STATUS.ALLOCATED);

      order.handOver();

      expect(order.status).toBe(ORDER_STATUS.HANDED_OVER);
    });

    it('引当済からキャンセルへ変更できる', () => {
      const order = createOrder(ORDER_STATUS.ALLOCATED);

      order.cancel();

      expect(order.status).toBe(ORDER_STATUS.CANCELLED);
    });
  });

  describe('禁止された状態遷移', () => {
    it('引き渡し済はキャンセルできない', () => {
      const order = createOrder(ORDER_STATUS.HANDED_OVER);

      expect(() => order.cancel()).toThrow(InvalidOrderStatusTransitionError);
      expect(order.status).toBe(ORDER_STATUS.HANDED_OVER);
    });

    it('引き渡し済を再度引き渡すことはできない', () => {
      const order = createOrder(ORDER_STATUS.HANDED_OVER);

      expect(() => order.handOver()).toThrow(InvalidOrderStatusTransitionError);
    });

    it('キャンセル済は引き渡しもキャンセルもできない', () => {
      const order = createOrder(ORDER_STATUS.CANCELLED);

      expect(() => order.handOver()).toThrow(InvalidOrderStatusTransitionError);
      expect(() => order.cancel()).toThrow(InvalidOrderStatusTransitionError);
    });
  });
});

describe('OrderQuantity', () => {
  it('1以上の整数を受け付ける', () => {
    expect(OrderQuantity.of(1).value).toBe(1);
    expect(OrderQuantity.of(120).value).toBe(120);
  });

  it.each([0, -1, 1.5, Number.NaN])('%pは注文数量として扱わない', (value) => {
    expect(() => OrderQuantity.of(value)).toThrow(InvalidOrderQuantityError);
  });
});
