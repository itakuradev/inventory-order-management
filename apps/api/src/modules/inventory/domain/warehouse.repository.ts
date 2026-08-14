/**
 * 初期版はOrganizationあたりWarehouse 1件固定という前提を、この境界に閉じ込める。
 * 複数拠点を扱う場合はここを起点に見直す。
 */
export abstract class WarehouseRepository {
  abstract findDefaultWarehouseId(organizationId: string): Promise<string | null>;
}
