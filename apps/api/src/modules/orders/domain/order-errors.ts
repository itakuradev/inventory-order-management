import { BusinessRuleViolationError } from '../../../common/errors/application-errors';

/** 許可されていないステータス遷移が要求された。 */
export class InvalidOrderStatusTransitionError extends BusinessRuleViolationError {
  override readonly code = 'INVALID_ORDER_STATUS_TRANSITION';
}

/** 注文数量が業務上許容されない値。 */
export class InvalidOrderQuantityError extends BusinessRuleViolationError {
  override readonly code = 'CONFLICT';
}
