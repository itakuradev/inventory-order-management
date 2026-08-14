import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import { OrderRepository } from '../domain/order.repository';

export type HandOverOrderCommand = {
  organizationId: string;
  orderId: string;
};

/**
 * 出荷オーダーを後続の出荷工程へ引き渡す。
 *
 * Allocationは維持し、onHandQuantity・allocatedQuantityは変更しない。
 * 実在庫の減算は出荷完了処理で行う想定で、初期版では扱わない。
 */
@Injectable()
export class HandOverOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(command: HandOverOrderCommand): Promise<void> {
    await this.transactionRunner.run(async () => {
      const order = await this.orderRepository.findByIdInOrganization(
        command.orderId,
        command.organizationId,
      );
      if (!order) {
        throw new ResourceNotFoundError('対象の出荷オーダーが見つかりません');
      }

      order.handOver();
      await this.orderRepository.updateStatus(order);
    });
  }
}
