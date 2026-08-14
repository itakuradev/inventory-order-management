import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../prisma/transaction-context';
import { ProductCatalog, type CatalogProduct } from '../domain/product-catalog';

@Injectable()
export class PrismaProductCatalog extends ProductCatalog {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  override async shipperExists(organizationId: string, shipperId: string): Promise<boolean> {
    const shipper = await this.context.executor.shipper.findFirst({
      where: { id: shipperId, organizationId },
      select: { id: true },
    });

    return shipper !== null;
  }

  override async findProductsOfShipper(
    shipperId: string,
    productIds: string[],
  ): Promise<CatalogProduct[]> {
    return this.context.executor.product.findMany({
      where: { shipperId, id: { in: productIds } },
      select: { id: true, sku: true, name: true, unit: true },
    });
  }
}
