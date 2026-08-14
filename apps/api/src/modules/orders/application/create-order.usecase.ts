import { Injectable } from '@nestjs/common';
import type { StockShortage } from '@logimaster/contracts';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import type { NewAllocation } from '../../inventory/domain/allocation';
import { AllocationRepository } from '../../inventory/domain/allocation.repository';
import type { Inventory } from '../../inventory/domain/inventory';
import { InsufficientStockError } from '../../inventory/domain/inventory-errors';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { WarehouseRepository } from '../../inventory/domain/warehouse.repository';
import { INITIAL_ORDER_STATUS, type OrderDraft } from '../domain/order';
import { OrderNumberGenerator } from '../domain/order-number-generator';
import { OrderQuantity } from '../domain/order-quantity';
import { OrderRepository } from '../domain/order.repository';
import { ProductCatalog } from '../domain/product-catalog';

export type CreateOrderCommand = {
  organizationId: string;
  createdByUserId: string;
  shipperId: string;
  destinationName: string;
  destinationAddress: string;
  /** YYYY-MM-DD */
  requestedShipDate: string;
  items: { productId: string; quantity: number }[];
};

type AllocationPlan = {
  productId: string;
  inventory: Inventory;
  quantity: number;
};

/**
 * 出荷オーダーを登録し、あわせて在庫を引き当てる。
 *
 * 在庫確認・Order作成・OrderItem作成・Allocation作成・Inventory更新を
 * 1つの業務単位として同一Transactionで処理する。
 * 1商品でも引当できない場合はオーダー全体を失敗させ、部分引当は行わない。
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productCatalog: ProductCatalog,
    private readonly orderNumberGenerator: OrderNumberGenerator,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly allocationRepository: AllocationRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(command: CreateOrderCommand): Promise<{ orderId: string }> {
    return this.transactionRunner.run(async () => {
      const warehouseId = await this.resolveWarehouseId(command.organizationId);
      const productById = await this.resolveProducts(command);

      const plans = this.buildAllocationPlans(
        command,
        productById,
        await this.loadInventories(warehouseId, command),
      );

      const order = await this.orderRepository.create(this.toDraft(command));

      const allocations: NewAllocation[] = [];
      const planByProductId = new Map(plans.map((plan) => [plan.productId, plan]));

      for (const item of order.items) {
        const plan = planByProductId.get(item.productId);
        if (!plan) {
          throw new Error(`引当計画が見つかりません: productId=${item.productId}`);
        }
        allocations.push({
          orderItemId: item.id,
          inventoryId: plan.inventory.id,
          quantity: item.quantity,
        });
        plan.inventory.allocate(item.quantity);
      }

      await this.allocationRepository.createMany(allocations);

      for (const plan of plans) {
        await this.inventoryRepository.updateQuantities(plan.inventory);
      }

      return { orderId: order.id };
    });
  }

  private async resolveWarehouseId(organizationId: string): Promise<string> {
    const warehouseId = await this.warehouseRepository.findDefaultWarehouseId(organizationId);
    if (!warehouseId) {
      throw new ResourceNotFoundError('物流センターが登録されていません');
    }
    return warehouseId;
  }

  private async resolveProducts(
    command: CreateOrderCommand,
  ): Promise<Map<string, { id: string; sku: string; name: string }>> {
    const shipperExists = await this.productCatalog.shipperExists(
      command.organizationId,
      command.shipperId,
    );
    if (!shipperExists) {
      throw new ResourceNotFoundError('指定された荷主が見つかりません');
    }

    const productIds = command.items.map((item) => item.productId);
    const products = await this.productCatalog.findProductsOfShipper(command.shipperId, productIds);
    const productById = new Map(products.map((product) => [product.id, product]));

    const unknownProductIds = productIds.filter((productId) => !productById.has(productId));
    if (unknownProductIds.length > 0) {
      throw new ResourceNotFoundError('指定された商品が荷主の商品として登録されていません');
    }

    return productById;
  }

  private async loadInventories(
    warehouseId: string,
    command: CreateOrderCommand,
  ): Promise<Map<string, Inventory>> {
    const inventories = await this.inventoryRepository.findByProductIds(
      warehouseId,
      command.items.map((item) => item.productId),
    );
    return new Map(inventories.map((inventory) => [inventory.productId, inventory]));
  }

  private buildAllocationPlans(
    command: CreateOrderCommand,
    productById: Map<string, { id: string; sku: string; name: string }>,
    inventoryByProductId: Map<string, Inventory>,
  ): AllocationPlan[] {
    const plans: AllocationPlan[] = [];
    const shortages: StockShortage[] = [];

    for (const item of command.items) {
      const product = productById.get(item.productId);
      const inventory = inventoryByProductId.get(item.productId);

      if (!inventory || !inventory.canAllocate(item.quantity)) {
        shortages.push({
          productId: item.productId,
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          requestedQuantity: item.quantity,
          availableQuantity: inventory?.availableQuantity ?? 0,
        });
        continue;
      }

      plans.push({ productId: item.productId, inventory, quantity: item.quantity });
    }

    if (shortages.length > 0) {
      throw new InsufficientStockError(shortages);
    }

    return plans;
  }

  private toDraft(command: CreateOrderCommand): OrderDraft {
    return {
      organizationId: command.organizationId,
      shipperId: command.shipperId,
      orderNumber: this.orderNumberGenerator.generate(),
      destinationName: command.destinationName,
      destinationAddress: command.destinationAddress,
      requestedShipDate: new Date(`${command.requestedShipDate}T00:00:00.000Z`),
      status: INITIAL_ORDER_STATUS,
      createdByUserId: command.createdByUserId,
      items: command.items.map((item) => ({
        productId: item.productId,
        quantity: OrderQuantity.of(item.quantity),
      })),
    };
  }
}
