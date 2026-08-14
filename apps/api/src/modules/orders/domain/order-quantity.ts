import { InvalidOrderQuantityError } from './order-errors';

/**
 * 注文数量。1以上の整数のみを許容する。
 * 数量は在庫引当の正しさに直結するため、専用の型として表現している。
 */
export class OrderQuantity {
  private constructor(readonly value: number) {}

  static of(value: number): OrderQuantity {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidOrderQuantityError('注文数量は1以上の整数で指定してください');
    }
    return new OrderQuantity(value);
  }
}
