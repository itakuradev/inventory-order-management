import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import { InventoryRepository } from '../domain/inventory.repository';

export type AdjustInventoryCommand = {
  organizationId: string;
  inventoryId: string;
  onHandQuantity: number;
};

/**
 * 実在庫の調整。ADMINのみ実行できる（認可はpresentation層のGuardで判定する）。
 * 引当済数量を下回る調整はDomainの不変条件により拒否される。
 */
@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(command: AdjustInventoryCommand): Promise<void> {
    await this.transactionRunner.run(async () => {
      const inventory = await this.inventoryRepository.findByIdInOrganization(
        command.inventoryId,
        command.organizationId,
      );

      if (!inventory) {
        throw new ResourceNotFoundError('対象の在庫が見つかりません');
      }

      inventory.adjustOnHandTo(command.onHandQuantity);
      await this.inventoryRepository.updateQuantities(inventory);
    });
  }
}
