/**
 * 出荷オーダー登録時の荷主・商品確認に必要な参照。
 * 一覧表示用のマスタ参照とは目的が異なるため、ordersのdomainポートとして定義する。
 */
export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
};

export abstract class ProductCatalog {
  abstract shipperExists(organizationId: string, shipperId: string): Promise<boolean>;

  /** 指定した荷主に属する商品のみを返す。荷主違いの商品は結果に含まれない。 */
  abstract findProductsOfShipper(
    shipperId: string,
    productIds: string[],
  ): Promise<CatalogProduct[]>;
}
