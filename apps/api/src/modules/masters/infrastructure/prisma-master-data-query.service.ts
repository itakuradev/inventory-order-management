import { Injectable } from '@nestjs/common';
import type { ProductView, ShipperView } from '@logimaster/contracts';
import { TransactionContext } from '../../../prisma/transaction-context';
import { MasterDataQueryService } from '../application/master-data-query.service';

@Injectable()
export class PrismaMasterDataQueryService extends MasterDataQueryService {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override listShippers(organizationId: string): Promise<ShipperView[]> {
    return this.context.executor.shipper.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  override listProductsOfShipper(
    organizationId: string,
    shipperId: string,
  ): Promise<ProductView[]> {
    return this.context.executor.product.findMany({
      where: { shipperId, shipper: { organizationId } },
      orderBy: { sku: 'asc' },
      select: { id: true, sku: true, name: true, unit: true, shipperId: true },
    });
  }
}
