import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CancelOrderUseCase } from './application/cancel-order.usecase';
import { CreateOrderUseCase } from './application/create-order.usecase';
import { HandOverOrderUseCase } from './application/hand-over-order.usecase';
import { OrderQueryService } from './application/order-query.service';
import { OrderNumberGenerator } from './domain/order-number-generator';
import { OrderRepository } from './domain/order.repository';
import { ProductCatalog } from './domain/product-catalog';
import { PrismaOrderQueryService } from './infrastructure/prisma-order-query.service';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository';
import { PrismaProductCatalog } from './infrastructure/prisma-product-catalog';
import { UlidOrderNumberGenerator } from './infrastructure/ulid-order-number-generator';
import { OrderController } from './presentation/order.controller';

@Module({
  // 出荷オーダー登録・キャンセルは在庫引当を伴うため、inventoryのRepositoryを利用する。
  imports: [InventoryModule],
  controllers: [OrderController],
  providers: [
    CreateOrderUseCase,
    CancelOrderUseCase,
    HandOverOrderUseCase,
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    { provide: ProductCatalog, useClass: PrismaProductCatalog },
    { provide: OrderNumberGenerator, useClass: UlidOrderNumberGenerator },
    { provide: OrderQueryService, useClass: PrismaOrderQueryService },
  ],
})
export class OrdersModule {}
