import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import { AllocationRepository } from '../../inventory/domain/allocation.repository';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { OrderRepository } from '../domain/order.repository';

export type CancelOrderCommand = {
  organizationId: string;
  orderId: string;
};

/**
 * 出荷オーダーをキャンセルする。
 *
 * ステータス変更・Allocationの解除・Inventory.allocatedQuantityの減算を
 * 同一Transactionで処理し、途中状態を残さない。
 * Allocationは削除せず、releasedAtを記録して履歴を保持する。
 */
@Injectable()
export class CancelOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    await this.transactionRunner.run(async () => {
      const order = await this.orderRepository.findByIdInOrganization(
        command.orderId,
        command.organizationId,
      );
      if (!order) {
        throw new ResourceNotFoundError('対象の出荷オーダーが見つかりません');
      }

      order.cancel();

      const allocations = await this.allocationRepository.findActiveByOrderId(order.id);
      const releasedAt = new Date();
      const releasedQuantityByInventoryId = new Map<string, number>();

      for (const allocation of allocations) {
        allocation.release(releasedAt);
        releasedQuantityByInventoryId.set(
          allocation.inventoryId,
          (releasedQuantityByInventoryId.get(allocation.inventoryId) ?? 0) + allocation.quantity,
        );
      }

      await this.allocationRepository.markReleased(allocations);

      for (const [inventoryId, quantity] of releasedQuantityByInventoryId) {
        const inventory = await this.inventoryRepository.findByIdInOrganization(
          inventoryId,
          command.organizationId,
        );
        if (!inventory) {
          throw new ResourceNotFoundError('引当対象の在庫が見つかりません');
        }
        inventory.release(quantity);
        await this.inventoryRepository.updateQuantities(inventory);
      }

      await this.orderRepository.updateStatus(order);
    });
  }
}
