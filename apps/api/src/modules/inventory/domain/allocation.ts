import { BusinessRuleViolationError } from '../../../common/errors/application-errors';

export class AllocationAlreadyReleasedError extends BusinessRuleViolationError {
  override readonly code = 'CONFLICT';
}

type AllocationProps = {
  id: string;
  orderItemId: string;
  inventoryId: string;
  quantity: number;
  releasedAt: Date | null;
};

/** 新規に作成する引当。IDは永続化時に採番する。 */
export type NewAllocation = {
  orderItemId: string;
  inventoryId: string;
  quantity: number;
};

/**
 * 在庫引当の記録。
 * 解除時も削除せず、releasedAtを記録して履歴として残す。
 */
export class Allocation {
  private constructor(
    readonly id: string,
    readonly orderItemId: string,
    readonly inventoryId: string,
    readonly quantity: number,
    private currentReleasedAt: Date | null,
  ) {}

  static reconstruct(props: AllocationProps): Allocation {
    return new Allocation(
      props.id,
      props.orderItemId,
      props.inventoryId,
      props.quantity,
      props.releasedAt,
    );
  }

  get releasedAt(): Date | null {
    return this.currentReleasedAt;
  }

  get isActive(): boolean {
    return this.currentReleasedAt === null;
  }

  release(releasedAt: Date): void {
    if (!this.isActive) {
      throw new AllocationAlreadyReleasedError('既に解除済みの引当です');
    }
    this.currentReleasedAt = releasedAt;
  }
}
