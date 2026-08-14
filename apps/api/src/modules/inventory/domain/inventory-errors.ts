import type { StockShortage } from '@logimaster/contracts';
import { BusinessRuleViolationError } from '../../../common/errors/application-errors';

/** 引当可能在庫が不足しているため引当できない。 */
export class InsufficientStockError extends BusinessRuleViolationError {
  override readonly code = 'INSUFFICIENT_STOCK';
  override readonly details: { shortages: StockShortage[] };

  constructor(shortages: StockShortage[]) {
    super(InsufficientStockError.buildMessage(shortages));
    this.details = { shortages };
  }

  private static buildMessage(shortages: StockShortage[]): string {
    const detail = shortages
      .map(
        (shortage) =>
          `${shortage.sku} ${shortage.productName}（必要 ${shortage.requestedQuantity} / 引当可能 ${shortage.availableQuantity}）`,
      )
      .join('、');
    return `在庫が不足しているため引当できません: ${detail}`;
  }
}

/** 在庫の不変条件を破る操作が要求された。 */
export class InventoryInvariantViolationError extends BusinessRuleViolationError {
  override readonly code = 'INVENTORY_INVARIANT_VIOLATION';
}
