import type { Allocation, NewAllocation } from './allocation';

export abstract class AllocationRepository {
  abstract createMany(allocations: NewAllocation[]): Promise<void>;

  /** 解除されていない引当のみを返す。 */
  abstract findActiveByOrderId(orderId: string): Promise<Allocation[]>;

  abstract markReleased(allocations: Allocation[]): Promise<void>;
}
