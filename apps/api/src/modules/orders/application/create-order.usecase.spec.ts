import { ORDER_STATUS } from '@logimaster/contracts';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import type { Allocation, NewAllocation } from '../../inventory/domain/allocation';
import { AllocationRepository } from '../../inventory/domain/allocation.repository';
import { Inventory } from '../../inventory/domain/inventory';
import { InsufficientStockError } from '../../inventory/domain/inventory-errors';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { WarehouseRepository } from '../../inventory/domain/warehouse.repository';
import type { Order, OrderDraft, PersistedOrder } from '../domain/order';
import { OrderNumberGenerator } from '../domain/order-number-generator';
import { OrderRepository } from '../domain/order.repository';
import { ProductCatalog, type CatalogProduct } from '../domain/product-catalog';
import { CreateOrderUseCase } from './create-order.usecase';

class FakeTransactionRunner extends TransactionRunner {
  runCount = 0;

  override run<T>(work: () => Promise<T>): Promise<T> {
    this.runCount += 1;
    return work();
  }
}

class FakeWarehouseRepository extends WarehouseRepository {
  override async findDefaultWarehouseId(): Promise<string | null> {
    return 'wh-1';
  }
}

class FakeProductCatalog extends ProductCatalog {
  constructor(
    private readonly products: CatalogProduct[],
    private readonly hasShipper = true,
  ) {
    super();
  }

  override async shipperExists(): Promise<boolean> {
    return this.hasShipper;
  }

  override async findProductsOfShipper(
    _shipperId: string,
    productIds: string[],
  ): Promise<CatalogProduct[]> {
    return this.products.filter((product) => productIds.includes(product.id));
  }
}

class FakeInventoryRepository extends InventoryRepository {
  readonly updated: Inventory[] = [];

  constructor(private readonly inventories: Inventory[]) {
    super();
  }

  override async findByIdInOrganization(inventoryId: string): Promise<Inventory | null> {
    return this.inventories.find((inventory) => inventory.id === inventoryId) ?? null;
  }

  override async findByProductIds(
    _warehouseId: string,
    productIds: string[],
  ): Promise<Inventory[]> {
    return this.inventories.filter((inventory) => productIds.includes(inventory.productId));
  }

  override async updateQuantities(inventory: Inventory): Promise<void> {
    this.updated.push(inventory);
  }
}

class FakeAllocationRepository extends AllocationRepository {
  readonly created: NewAllocation[] = [];

  override async createMany(allocations: NewAllocation[]): Promise<void> {
    this.created.push(...allocations);
  }

  override async findActiveByOrderId(): Promise<Allocation[]> {
    return [];
  }

  override async markReleased(): Promise<void> {}
}

class FakeOrderRepository extends OrderRepository {
  readonly drafts: OrderDraft[] = [];

  override async create(draft: OrderDraft): Promise<PersistedOrder> {
    this.drafts.push(draft);
    return {
      id: 'ord-1',
      orderNumber: draft.orderNumber,
      items: draft.items.map((item, index) => ({
        id: `itm-${index}`,
        productId: item.productId,
        quantity: item.quantity.value,
      })),
    };
  }

  override async findByIdInOrganization(): Promise<Order | null> {
    return null;
  }

  override async updateStatus(): Promise<void> {}
}

class FixedOrderNumberGenerator extends OrderNumberGenerator {
  override generate(): string {
    return 'SO-TEST';
  }
}

const PRODUCTS: CatalogProduct[] = [
  { id: 'prd-1', sku: 'FD-1001', name: 'ロースハム', unit: '個' },
  { id: 'prd-2', sku: 'FD-1002', name: 'カットわかめ', unit: '個' },
];

function createInventory(id: string, productId: string, onHand: number, allocated: number) {
  return Inventory.reconstruct({
    id,
    warehouseId: 'wh-1',
    productId,
    onHandQuantity: onHand,
    allocatedQuantity: allocated,
  });
}

type Setup = {
  useCase: CreateOrderUseCase;
  orderRepository: FakeOrderRepository;
  allocationRepository: FakeAllocationRepository;
  inventoryRepository: FakeInventoryRepository;
  transactionRunner: FakeTransactionRunner;
};

function setup(inventories: Inventory[], hasShipper = true): Setup {
  const orderRepository = new FakeOrderRepository();
  const allocationRepository = new FakeAllocationRepository();
  const inventoryRepository = new FakeInventoryRepository(inventories);
  const transactionRunner = new FakeTransactionRunner();

  const useCase = new CreateOrderUseCase(
    orderRepository,
    new FakeProductCatalog(PRODUCTS, hasShipper),
    new FixedOrderNumberGenerator(),
    new FakeWarehouseRepository(),
    inventoryRepository,
    allocationRepository,
    transactionRunner,
  );

  return { useCase, orderRepository, allocationRepository, inventoryRepository, transactionRunner };
}

const baseCommand = {
  organizationId: 'org-1',
  createdByUserId: 'usr-1',
  shipperId: 'shp-1',
  destinationName: '大阪支店',
  destinationAddress: '大阪府大阪市北区1-1-1',
  requestedShipDate: '2026-08-20',
};

describe('CreateOrderUseCase', () => {
  it('全商品を引き当てられる場合、Order・Allocation・Inventoryを更新する', async () => {
    const inventory1 = createInventory('inv-1', 'prd-1', 100, 0);
    const inventory2 = createInventory('inv-2', 'prd-2', 50, 10);
    const { useCase, orderRepository, allocationRepository, transactionRunner } = setup([
      inventory1,
      inventory2,
    ]);

    const result = await useCase.execute({
      ...baseCommand,
      items: [
        { productId: 'prd-1', quantity: 10 },
        { productId: 'prd-2', quantity: 40 },
      ],
    });

    expect(result.orderId).toBe('ord-1');
    expect(orderRepository.drafts[0].status).toBe(ORDER_STATUS.ALLOCATED);
    expect(orderRepository.drafts[0].orderNumber).toBe('SO-TEST');
    expect(allocationRepository.created).toEqual([
      { orderItemId: 'itm-0', inventoryId: 'inv-1', quantity: 10 },
      { orderItemId: 'itm-1', inventoryId: 'inv-2', quantity: 40 },
    ]);
    expect(inventory1.allocatedQuantity).toBe(10);
    expect(inventory2.allocatedQuantity).toBe(50);
    // 実在庫は引当では減らさない
    expect(inventory1.onHandQuantity).toBe(100);
    expect(transactionRunner.runCount).toBe(1);
  });

  it('1商品でも在庫が不足する場合、オーダー全体を失敗させ部分引当を行わない', async () => {
    const inventory1 = createInventory('inv-1', 'prd-1', 100, 0);
    const inventory2 = createInventory('inv-2', 'prd-2', 50, 45);
    const { useCase, orderRepository, allocationRepository, inventoryRepository } = setup([
      inventory1,
      inventory2,
    ]);

    await expect(
      useCase.execute({
        ...baseCommand,
        items: [
          { productId: 'prd-1', quantity: 10 },
          { productId: 'prd-2', quantity: 6 },
        ],
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    expect(orderRepository.drafts).toHaveLength(0);
    expect(allocationRepository.created).toHaveLength(0);
    expect(inventoryRepository.updated).toHaveLength(0);
    expect(inventory1.allocatedQuantity).toBe(0);
    expect(inventory2.allocatedQuantity).toBe(45);
  });

  it('在庫不足エラーに対象商品と不足内容を含める', async () => {
    const { useCase } = setup([createInventory('inv-2', 'prd-2', 50, 45)]);

    await expect(
      useCase.execute({ ...baseCommand, items: [{ productId: 'prd-2', quantity: 6 }] }),
    ).rejects.toMatchObject({
      details: {
        shortages: [
          {
            productId: 'prd-2',
            sku: 'FD-1002',
            productName: 'カットわかめ',
            requestedQuantity: 6,
            availableQuantity: 5,
          },
        ],
      },
    });
  });

  it('在庫レコードが存在しない商品は在庫不足として扱う', async () => {
    const { useCase } = setup([]);

    await expect(
      useCase.execute({ ...baseCommand, items: [{ productId: 'prd-1', quantity: 1 }] }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it('荷主が存在しない場合は404相当のエラーにする', async () => {
    const { useCase } = setup([createInventory('inv-1', 'prd-1', 100, 0)], false);

    await expect(
      useCase.execute({ ...baseCommand, items: [{ productId: 'prd-1', quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('荷主に属さない商品を指定した場合は404相当のエラーにする', async () => {
    const { useCase } = setup([createInventory('inv-9', 'prd-9', 100, 0)]);

    await expect(
      useCase.execute({ ...baseCommand, items: [{ productId: 'prd-9', quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
