import type { InventoryView, ListInventoriesQuery, Paginated } from '@logimaster/contracts';

/**
 * 一覧表示のための参照専用ポート。
 * 商品・荷主を結合した表示用データを返すため、Domainの集約とは別に用意している。
 */
export abstract class InventoryQueryService {
  abstract list(
    organizationId: string,
    query: ListInventoriesQuery,
  ): Promise<Paginated<InventoryView>>;
}
