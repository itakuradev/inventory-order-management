import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@logimaster/contracts';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { TransactionContext } from '../../../prisma/transaction-context';
import { Order, type OrderDraft, type PersistedOrder } from '../domain/order';
import { OrderRepository } from '../domain/order.repository';

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async create(draft: OrderDraft): Promise<PersistedOrder> {
    const record = await this.context.executor.order.create({
      data: {
        organizationId: draft.organizationId,
        shipperId: draft.shipperId,
        orderNumber: draft.orderNumber,
        destinationName: draft.destinationName,
        destinationAddress: draft.destinationAddress,
        requestedShipDate: draft.requestedShipDate,
        status: draft.status as PrismaOrderStatus,
        createdByUserId: draft.createdByUserId,
        items: {
          create: draft.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity.value,
          })),
        },
      },
      include: { items: true },
    });

    return {
      id: record.id,
      orderNumber: record.orderNumber,
      items: record.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }

  override async findByIdInOrganization(
    orderId: string,
    organizationId: string,
  ): Promise<Order | null> {
    const record = await this.context.executor.order.findFirst({
      where: { id: orderId, organizationId },
    });

    if (!record) {
      return null;
    }

    return Order.reconstruct({
      id: record.id,
      organizationId: record.organizationId,
      orderNumber: record.orderNumber,
      status: record.status as OrderStatus,
    });
  }

  override async updateStatus(order: Order): Promise<void> {
    await this.context.executor.order.update({
      where: { id: order.id },
      data: { status: order.status as PrismaOrderStatus },
    });
  }
}
