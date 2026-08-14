import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../prisma/transaction-context';
import { Inventory } from '../domain/inventory';
import { InventoryRepository } from '../domain/inventory.repository';

@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async findByIdInOrganization(
    inventoryId: string,
    organizationId: string,
  ): Promise<Inventory | null> {
    const record = await this.context.executor.inventory.findFirst({
      where: { id: inventoryId, warehouse: { organizationId } },
    });

    return record ? this.toDomain(record) : null;
  }

  override async findByProductIds(
    warehouseId: string,
    productIds: string[],
  ): Promise<Inventory[]> {
    const records = await this.context.executor.inventory.findMany({
      where: { warehouseId, productId: { in: productIds } },
    });

    return records.map((record) => this.toDomain(record));
  }

  override async updateQuantities(inventory: Inventory): Promise<void> {
    await this.context.executor.inventory.update({
      where: { id: inventory.id },
      data: {
        onHandQuantity: inventory.onHandQuantity,
        allocatedQuantity: inventory.allocatedQuantity,
      },
    });
  }

  private toDomain(record: {
    id: string;
    warehouseId: string;
    productId: string;
    onHandQuantity: number;
    allocatedQuantity: number;
  }): Inventory {
    return Inventory.reconstruct({
      id: record.id,
      warehouseId: record.warehouseId,
      productId: record.productId,
      onHandQuantity: record.onHandQuantity,
      allocatedQuantity: record.allocatedQuantity,
    });
  }
}
