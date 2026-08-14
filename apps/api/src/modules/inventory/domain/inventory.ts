import { InventoryInvariantViolationError } from './inventory-errors';

type InventoryProps = {
  id: string;
  warehouseId: string;
  productId: string;
  onHandQuantity: number;
  allocatedQuantity: number;
};

/**
 * 物流センターにおける1商品の在庫。
 *
 * 常に次の不変条件を満たす。
 *   onHandQuantity >= 0
 *   allocatedQuantity >= 0
 *   allocatedQuantity <= onHandQuantity
 */
export class Inventory {
  private constructor(
    readonly id: string,
    readonly warehouseId: string,
    readonly productId: string,
    private currentOnHandQuantity: number,
    private currentAllocatedQuantity: number,
  ) {}

  static reconstruct(props: InventoryProps): Inventory {
    const inventory = new Inventory(
      props.id,
      props.warehouseId,
      props.productId,
      props.onHandQuantity,
      props.allocatedQuantity,
    );
    inventory.assertInvariants();
    return inventory;
  }

  get onHandQuantity(): number {
    return this.currentOnHandQuantity;
  }

  get allocatedQuantity(): number {
    return this.currentAllocatedQuantity;
  }

  /** 引当可能在庫はDBへ保存せず、常に実在庫と引当済在庫から算出する。 */
  get availableQuantity(): number {
    return this.currentOnHandQuantity - this.currentAllocatedQuantity;
  }

  canAllocate(quantity: number): boolean {
    return quantity > 0 && quantity <= this.availableQuantity;
  }

  allocate(quantity: number): void {
    if (!this.canAllocate(quantity)) {
      throw new InventoryInvariantViolationError(
        `引当可能在庫を超える引当はできません（要求 ${quantity} / 引当可能 ${this.availableQuantity}）`,
      );
    }
    this.currentAllocatedQuantity += quantity;
    this.assertInvariants();
  }

  release(quantity: number): void {
    if (quantity <= 0 || quantity > this.currentAllocatedQuantity) {
      throw new InventoryInvariantViolationError(
        `引当済数量を超える引当解除はできません（要求 ${quantity} / 引当済 ${this.currentAllocatedQuantity}）`,
      );
    }
    this.currentAllocatedQuantity -= quantity;
    this.assertInvariants();
  }

  /** 実在庫の調整。引当済数量を下回る値へは調整できない。 */
  adjustOnHandTo(quantity: number): void {
    if (quantity < 0) {
      throw new InventoryInvariantViolationError('実在庫を負数へ調整することはできません');
    }
    if (quantity < this.currentAllocatedQuantity) {
      throw new InventoryInvariantViolationError(
        `引当済数量を下回る実在庫へは調整できません（指定 ${quantity} / 引当済 ${this.currentAllocatedQuantity}）`,
      );
    }
    this.currentOnHandQuantity = quantity;
    this.assertInvariants();
  }

  private assertInvariants(): void {
    if (this.currentOnHandQuantity < 0) {
      throw new InventoryInvariantViolationError('実在庫が負数になっています');
    }
    if (this.currentAllocatedQuantity < 0) {
      throw new InventoryInvariantViolationError('引当済在庫が負数になっています');
    }
    if (this.currentAllocatedQuantity > this.currentOnHandQuantity) {
      throw new InventoryInvariantViolationError('引当済在庫が実在庫を超えています');
    }
  }
}
