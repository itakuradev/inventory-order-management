import type { ProductView, ShipperView } from '@logimaster/contracts';

/**
 * 出荷オーダー登録・在庫一覧の絞り込みで使うマスタの参照専用ポート。
 * マスタCRUDは初期版の対象外のため、参照のみを提供する。
 */
export abstract class MasterDataQueryService {
  abstract listShippers(organizationId: string): Promise<ShipperView[]>;

  abstract listProductsOfShipper(organizationId: string, shipperId: string): Promise<ProductView[]>;
}
