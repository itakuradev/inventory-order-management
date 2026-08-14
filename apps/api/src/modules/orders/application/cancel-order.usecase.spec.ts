import { ORDER_STATUS, type OrderStatus } from '@logimaster/contracts';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { TransactionRunner } from '../../../common/transaction/transaction-runner';
import { Allocation } from '../../inventory/domain/allocation';
import { AllocationRepository } from '../../inventory/domain/allocation.repository';
import { Inventory } from '../../inventory/domain/inventory';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { Order } from '../domain/order';
import { InvalidOrderStatusTransitionError } from '../domain/order-errors';
import { OrderRepository } from '../domain/order.repository';
import { CancelOrderUseCase } from './cancel-order.usecase';

class FakeTransactionRunner extends TransactionRunner {
  runCount = 0;

  override run<T>(work: () => Promise<T>): Promise<T> {
    this.runCount += 1;
    return work();
  }
}

class FakeOrderRepository extends OrderRepository {
  readonly updated: Order[] = [];

  constructor(private readonly order: Order | null) {
    super();
  }

  override async create(): Promise<never> {
    throw new Error('未使用');
  }

  override async findByIdInOrganization(): Promise<Order | null> {
    return this.order;
  }

  override async updateStatus(order: Order): Promise<void> {
    this.updated.push(order);
  }
}

class FakeAllocationRepository extends AllocationRepository {
  readonly released: Allocation[] = [];

  constructor(private readonly active: Allocation[]) {
    super();
  }

  override async createMany(): Promise<void> {}

  override async findActiveByOrderId(): Promise<Allocation[]> {
    return this.active;
  }

  override async markReleased(allocations: Allocation[]): Promise<void> {
    this.released.push(...allocations);
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

  override async findByProductIds(): Promise<Inventory[]> {
    return this.inventories;
  }

  override async updateQuantities(inventory: Inventory): Promise<void> {
    this.updated.push(inventory);
  }
}

function createOrder(status: OrderStatus): Order {
  return Order.reconstruct({
    id: 'ord-1',
    organizationId: 'org-1',
    orderNumber: 'SO-TEST',
    status,
  });
}

function createAllocation(id: string, inventoryId: string, quantity: number): Allocation {
  return Allocation.reconstruct({
    id,
    orderItemId: `itm-${id}`,
    inventoryId,
    quantity,
    releasedAt: null,
  });
}

const command = { organizationId: 'org-1', orderId: 'ord-1' };

describe('CancelOrderUseCase', () => {
  it('ステータス変更・引当解除・引当済数量の減算を同一Transactionで行う', async () => {
    const order = createOrder(ORDER_STATUS.ALLOCATED);
    const inventory = Inventory.reconstruct({
      id: 'inv-1',
      warehouseId: 'wh-1',
      productId: 'prd-1',
      onHandQuantity: 100,
      allocatedQuantity: 17,
    });
    const allocations = [createAllocation('alc-1', 'inv-1', 10), createAllocation('alc-2', 'inv-1', 7)];

    const orderRepository = new FakeOrderRepository(order);
    const allocationRepository = new FakeAllocationRepository(allocations);
    const inventoryRepository = new FakeInventoryRepository([inventory]);
    const transactionRunner = new FakeTransactionRunner();

    await new CancelOrderUseCase(
      orderRepository,
      allocationRepository,
      inventoryRepository,
      transactionRunner,
    ).execute(command);

    expect(order.status).toBe(ORDER_STATUS.CANCELLED);
    expect(orderRepository.updated).toEqual([order]);
    expect(allocationRepository.released).toHaveLength(2);
    expect(allocations.every((allocation) => allocation.releasedAt !== null)).toBe(true);
    // 同一在庫への複数引当をまとめて戻す
    expect(inventory.allocatedQuantity).toBe(0);
    expect(inventory.onHandQuantity).toBe(100);
    expect(inventoryRepository.updated).toEqual([inventory]);
    expect(transactionRunner.runCount).toBe(1);
  });

  it('引き渡し済のオーダーはキャンセルできず、在庫も変更しない', async () => {
    const order = createOrder(ORDER_STATUS.HANDED_OVER);
    const inventory = Inventory.reconstruct({
      id: 'inv-1',
      warehouseId: 'wh-1',
      productId: 'prd-1',
      onHandQuantity: 100,
      allocatedQuantity: 10,
    });

    const orderRepository = new FakeOrderRepository(order);
    const allocationRepository = new FakeAllocationRepository([
      createAllocation('alc-1', 'inv-1', 10),
    ]);
    const inventoryRepository = new FakeInventoryRepository([inventory]);

    await expect(
      new CancelOrderUseCase(
        orderRepository,
        allocationRepository,
        inventoryRepository,
        new FakeTransactionRunner(),
      ).execute(command),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    expect(order.status).toBe(ORDER_STATUS.HANDED_OVER);
    expect(orderRepository.updated).toHaveLength(0);
    expect(allocationRepository.released).toHaveLength(0);
    expect(inventory.allocatedQuantity).toBe(10);
  });

  it('対象のオーダーが存在しない場合は404相当のエラーにする', async () => {
    await expect(
      new CancelOrderUseCase(
        new FakeOrderRepository(null),
        new FakeAllocationRepository([]),
        new FakeInventoryRepository([]),
        new FakeTransactionRunner(),
      ).execute(command),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
