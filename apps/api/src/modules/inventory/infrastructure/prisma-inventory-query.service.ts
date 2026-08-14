import { Injectable } from '@nestjs/common';
import type { InventoryView, ListInventoriesQuery, Paginated } from '@logimaster/contracts';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '../../../prisma/transaction-context';
import { InventoryQueryService } from '../application/inventory-query.service';

@Injectable()
export class PrismaInventoryQueryService extends InventoryQueryService {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async list(
    organizationId: string,
    query: ListInventoriesQuery,
  ): Promise<Paginated<InventoryView>> {
    const where: Prisma.InventoryWhereInput = {
      warehouse: { organizationId },
      ...(query.keyword
        ? {
            OR: [
              { product: { sku: { contains: query.keyword, mode: 'insensitive' } } },
              { product: { name: { contains: query.keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.shipperName
        ? { product: { shipper: { name: { contains: query.shipperName, mode: 'insensitive' } } } }
        : {}),
    };

    const [total, records] = await Promise.all([
      this.context.executor.inventory.count({ where }),
      this.context.executor.inventory.findMany({
        where,
        orderBy: this.toOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { product: { include: { shipper: true } } },
      }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        product: {
          id: record.product.id,
          sku: record.product.sku,
          name: record.product.name,
          unit: record.product.unit,
        },
        shipper: {
          id: record.product.shipper.id,
          code: record.product.shipper.code,
          name: record.product.shipper.name,
        },
        onHandQuantity: record.onHandQuantity,
        allocatedQuantity: record.allocatedQuantity,
        availableQuantity: record.onHandQuantity - record.allocatedQuantity,
        updatedAt: record.updatedAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private toOrderBy(query: ListInventoriesQuery): Prisma.InventoryOrderByWithRelationInput {
    switch (query.sortBy) {
      case 'productName':
        return { product: { name: query.sortOrder } };
      case 'updatedAt':
        return { updatedAt: query.sortOrder };
      case 'sku':
      default:
        return { product: { sku: query.sortOrder } };
    }
  }
}
