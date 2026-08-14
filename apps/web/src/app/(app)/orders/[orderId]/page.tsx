'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ORDER_STATUS } from '@logimaster/contracts';
import { Button } from '@/components/ui/button';
import { ErrorAlert, LoadingPanel } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApiErrorAlert } from '@/features/orders/api-error-alert';
import { useCancelOrder, useHandOverOrder, useOrderDetail } from '@/features/orders/use-orders';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const { data: order, isPending, isError, error } = useOrderDetail(orderId);
  const cancelOrder = useCancelOrder(orderId);
  const handOverOrder = useHandOverOrder(orderId);

  if (isPending) {
    return <LoadingPanel />;
  }

  if (isError) {
    return <ErrorAlert title={error.message} />;
  }

  const canOperate = order.status === ORDER_STATUS.ALLOCATED;
  const isSubmitting = cancelOrder.isPending || handOverOrder.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
        </div>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          一覧へ戻る
        </Link>
      </div>

      {cancelOrder.isError ? <ApiErrorAlert error={cancelOrder.error} /> : null}
      {handOverOrder.isError ? <ApiErrorAlert error={handOverOrder.error} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-base font-semibold text-slate-800">オーダー情報</h2>
        <dl>
          <DefinitionRow
            label="荷主"
            value={`${order.shipper.code} ${order.shipper.name}`}
          />
          <DefinitionRow label="出荷先名称" value={order.destinationName} />
          <DefinitionRow label="出荷先住所" value={order.destinationAddress} />
          <DefinitionRow label="希望出荷日" value={formatDate(order.requestedShipDate)} />
          <DefinitionRow label="登録者" value={order.createdByUserName} />
          <DefinitionRow label="登録日時" value={formatDateTime(order.createdAt)} />
          <DefinitionRow label="更新日時" value={formatDateTime(order.updatedAt)} />
        </dl>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-base font-semibold text-slate-800">
          商品（{order.itemCount} 品目）
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                  商品No
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                  商品名
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                  数量
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                  引当済数量
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                  単位
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{item.product.sku}</td>
                  <td className="px-4 py-3 text-slate-900">{item.product.name}</td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {formatNumber(item.allocatedQuantity)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.product.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800">操作</h2>
        {canOperate ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (window.confirm('この出荷オーダーを後続工程へ引き渡します。よろしいですか？')) {
                  handOverOrder.mutate();
                }
              }}
            >
              後続工程へ引き渡し
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isSubmitting}
              onClick={() => {
                if (window.confirm('この出荷オーダーをキャンセルし、引当を解除します。よろしいですか？')) {
                  cancelOrder.mutate();
                }
              }}
            >
              キャンセル
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            引当済の出荷オーダーのみ、引き渡しとキャンセルを行えます。
          </p>
        )}
      </section>
    </div>
  );
}
