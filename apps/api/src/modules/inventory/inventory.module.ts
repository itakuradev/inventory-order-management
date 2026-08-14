import { Module } from '@nestjs/common';
import { AdjustInventoryUseCase } from './application/adjust-inventory.usecase';
import { InventoryQueryService } from './application/inventory-query.service';
import { AllocationRepository } from './domain/allocation.repository';
import { InventoryRepository } from './domain/inventory.repository';
import { WarehouseRepository } from './domain/warehouse.repository';
import { PrismaAllocationRepository } from './infrastructure/prisma-allocation.repository';
import { PrismaInventoryQueryService } from './infrastructure/prisma-inventory-query.service';
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository';
import { PrismaWarehouseRepository } from './infrastructure/prisma-warehouse.repository';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [
    AdjustInventoryUseCase,
    { provide: InventoryRepository, useClass: PrismaInventoryRepository },
    { provide: AllocationRepository, useClass: PrismaAllocationRepository },
    { provide: WarehouseRepository, useClass: PrismaWarehouseRepository },
    { provide: InventoryQueryService, useClass: PrismaInventoryQueryService },
  ],
  // 出荷オーダー登録・キャンセルは在庫引当を伴うため、ordersモジュールへ公開する。
  exports: [InventoryRepository, AllocationRepository, WarehouseRepository],
})
export class InventoryModule {}
