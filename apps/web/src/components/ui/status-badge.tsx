import { ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from '@logimaster/contracts';

const STATUS_CLASS: Record<OrderStatus, string> = {
  [ORDER_STATUS.ALLOCATED]: 'bg-blue-50 text-blue-700 ring-blue-200',
  [ORDER_STATUS.HANDED_OVER]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [ORDER_STATUS.CANCELLED]: 'bg-slate-100 text-slate-600 ring-slate-300',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
