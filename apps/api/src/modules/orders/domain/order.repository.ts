import type { Order, OrderDraft, PersistedOrder } from './order';

export abstract class OrderRepository {
  abstract create(draft: OrderDraft): Promise<PersistedOrder>;

  /** テナント越しの参照を防ぐため、必ずOrganizationとあわせて解決する。 */
  abstract findByIdInOrganization(orderId: string, organizationId: string): Promise<Order | null>;

  abstract updateStatus(order: Order): Promise<void>;
}
