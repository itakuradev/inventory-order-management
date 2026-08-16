import { Injectable } from '@nestjs/common';
import type {
  ListOrdersQuery,
  OrderDetail,
  OrderSummary,
  Paginated,
} from '@logimaster/contracts';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '../../../prisma/transaction-context';
import { OrderQueryService } from '../application/order-query.service';

/** DATE型カラムはUTC 0時で保持されるため、そのままYYYY-MM-DDへ切り出す。 */
function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class PrismaOrderQueryService extends OrderQueryService {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async list(
    organizationId: string,
    query: ListOrdersQuery,
  ): Promise<Paginated<OrderSummary>> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      ...(query.orderNumber
        ? { orderNumber: { contains: query.orderNumber, mode: 'insensitive' } }
        : {}),
      ...(query.shipperName
        ? { shipper: { name: { contains: query.shipperName, mode: 'insensitive' } } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, records] = await Promise.all([
      this.context.executor.order.count({ where }),
      this.context.executor.order.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { shipper: true, _count: { select: { items: true } } },
      }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        orderNumber: record.orderNumber,
        shipper: {
          id: record.shipper.id,
          code: record.shipper.code,
          name: record.shipper.name,
        },
        destinationName: record.destinationName,
        itemCount: record._count.items,
        status: record.status,
        requestedShipDate: toIsoDate(record.requestedShipDate),
        createdAt: record.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  override async findDetail(organizationId: string, orderId: string): Promise<OrderDetail | null> {
    const record = await this.context.executor.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        shipper: true,
        createdByUser: true,
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: true,
            allocations: { where: { releasedAt: null } },
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      orderNumber: record.orderNumber,
      shipper: {
        id: record.shipper.id,
        code: record.shipper.code,
        name: record.shipper.name,
      },
      destinationName: record.destinationName,
      destinationAddress: record.destinationAddress,
      itemCount: record.items.length,
      status: record.status,
      requestedShipDate: toIsoDate(record.requestedShipDate),
      createdByUserName: record.createdByUser.name,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      items: record.items.map((item) => ({
        id: item.id,
        product: {
          id: item.product.id,
          sku: item.product.sku,
          name: item.product.name,
          unit: item.product.unit,
        },
        quantity: item.quantity,
        allocatedQuantity: item.allocations.reduce(
          (total, allocation) => total + allocation.quantity,
          0,
        ),
      })),
    };
  }
}
