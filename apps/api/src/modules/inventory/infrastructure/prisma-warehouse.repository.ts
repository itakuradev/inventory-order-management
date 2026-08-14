import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../prisma/transaction-context';
import { WarehouseRepository } from '../domain/warehouse.repository';

@Injectable()
export class PrismaWarehouseRepository extends WarehouseRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async findDefaultWarehouseId(organizationId: string): Promise<string | null> {
    const warehouse = await this.context.executor.warehouse.findFirst({
      where: { organizationId },
      orderBy: { code: 'asc' },
      select: { id: true },
    });

    return warehouse?.id ?? null;
  }
}
