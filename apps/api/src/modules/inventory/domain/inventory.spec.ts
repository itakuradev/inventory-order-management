import { Inventory } from './inventory';
import { InventoryInvariantViolationError } from './inventory-errors';

function createInventory(onHandQuantity: number, allocatedQuantity: number): Inventory {
  return Inventory.reconstruct({
    id: 'inv-1',
    warehouseId: 'wh-1',
    productId: 'prd-1',
    onHandQuantity,
    allocatedQuantity,
  });
}

describe('Inventory', () => {
  describe('引当可能在庫', () => {
    it('実在庫から引当済在庫を差し引いた数量になる', () => {
      expect(createInventory(100, 30).availableQuantity).toBe(70);
    });
  });

  describe('不変条件', () => {
    it('引当済在庫が実在庫を超える状態は復元できない', () => {
      expect(() => createInventory(10, 11)).toThrow(InventoryInvariantViolationError);
    });

    it('実在庫が負数の状態は復元できない', () => {
      expect(() => createInventory(-1, 0)).toThrow(InventoryInvariantViolationError);
    });
  });

  describe('在庫引当', () => {
    it('引当可能在庫と同数まで引き当てられる', () => {
      const inventory = createInventory(100, 30);

      expect(inventory.canAllocate(70)).toBe(true);
      inventory.allocate(70);

      expect(inventory.allocatedQuantity).toBe(100);
      expect(inventory.availableQuantity).toBe(0);
    });

    it('実在庫は引当によって減らない', () => {
      const inventory = createInventory(100, 0);

      inventory.allocate(40);

      expect(inventory.onHandQuantity).toBe(100);
    });

    it('引当可能在庫を1でも超える引当は拒否する', () => {
      const inventory = createInventory(100, 30);

      expect(inventory.canAllocate(71)).toBe(false);
      expect(() => inventory.allocate(71)).toThrow(InventoryInvariantViolationError);
      expect(inventory.allocatedQuantity).toBe(30);
    });
  });

  describe('引当解除', () => {
    it('引当済在庫を戻す', () => {
      const inventory = createInventory(100, 30);

      inventory.release(10);

      expect(inventory.allocatedQuantity).toBe(20);
      expect(inventory.availableQuantity).toBe(80);
    });

    it('引当済数量を超える解除は拒否する', () => {
      const inventory = createInventory(100, 30);

      expect(() => inventory.release(31)).toThrow(InventoryInvariantViolationError);
      expect(inventory.allocatedQuantity).toBe(30);
    });
  });

  describe('実在庫の調整', () => {
    it('指定した数量で実在庫を上書きする', () => {
      const inventory = createInventory(100, 30);

      inventory.adjustOnHandTo(500);

      expect(inventory.onHandQuantity).toBe(500);
      expect(inventory.allocatedQuantity).toBe(30);
      expect(inventory.availableQuantity).toBe(470);
    });

    it('引当済数量を下回る調整は拒否する', () => {
      const inventory = createInventory(100, 30);

      expect(() => inventory.adjustOnHandTo(29)).toThrow(InventoryInvariantViolationError);
      expect(inventory.onHandQuantity).toBe(100);
    });

    it('負数への調整は拒否する', () => {
      const inventory = createInventory(100, 0);

      expect(() => inventory.adjustOnHandTo(-1)).toThrow(InventoryInvariantViolationError);
    });
  });
});
