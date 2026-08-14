import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../prisma/transaction-context';
import { Allocation, type NewAllocation } from '../domain/allocation';
import { AllocationRepository } from '../domain/allocation.repository';

@Injectable()
export class PrismaAllocationRepository extends AllocationRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async createMany(allocations: NewAllocation[]): Promise<void> {
    if (allocations.length === 0) {
      return;
    }

    await this.context.executor.allocation.createMany({
      data: allocations.map((allocation) => ({
        orderItemId: allocation.orderItemId,
        inventoryId: allocation.inventoryId,
        quantity: allocation.quantity,
      })),
    });
  }

  override async findActiveByOrderId(orderId: string): Promise<Allocation[]> {
    const records = await this.context.executor.allocation.findMany({
      where: { releasedAt: null, orderItem: { orderId } },
    });

    return records.map((record) =>
      Allocation.reconstruct({
        id: record.id,
        orderItemId: record.orderItemId,
        inventoryId: record.inventoryId,
        quantity: record.quantity,
        releasedAt: record.releasedAt,
      }),
    );
  }

  override async markReleased(allocations: Allocation[]): Promise<void> {
    for (const allocation of allocations) {
      await this.context.executor.allocation.update({
        where: { id: allocation.id },
        data: { releasedAt: allocation.releasedAt },
      });
    }
  }
}
