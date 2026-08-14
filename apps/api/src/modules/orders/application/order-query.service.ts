import type {
  ListOrdersQuery,
  OrderDetail,
  OrderSummary,
  Paginated,
} from '@logimaster/contracts';

/** 一覧・詳細表示のための参照専用ポート。 */
export abstract class OrderQueryService {
  abstract list(organizationId: string, query: ListOrdersQuery): Promise<Paginated<OrderSummary>>;

  abstract findDetail(organizationId: string, orderId: string): Promise<OrderDetail | null>;
}
