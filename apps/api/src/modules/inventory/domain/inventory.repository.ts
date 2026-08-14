import type { Inventory } from './inventory';

export abstract class InventoryRepository {
  /** テナント越しの参照を防ぐため、必ずOrganizationとあわせて解決する。 */
  abstract findByIdInOrganization(
    inventoryId: string,
    organizationId: string,
  ): Promise<Inventory | null>;

  abstract findByProductIds(warehouseId: string, productIds: string[]): Promise<Inventory[]>;

  abstract updateQuantities(inventory: Inventory): Promise<void>;
}
