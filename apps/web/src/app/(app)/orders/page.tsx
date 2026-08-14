'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  type OrderStatus,
  type SortOrder,
} from '@logimaster/contracts';
import { Button } from '@/components/ui/button';
import { ErrorAlert, InfoPanel, LoadingPanel } from '@/components/ui/feedback';
import { Field, Select, TextInput } from '@/components/ui/form';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination, SortableHeader, TableHeader } from '@/components/ui/table';
import { useOrders, type OrderListParams } from '@/features/orders/use-orders';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

type SearchForm = {
  orderNumber: string;
  shipperName: string;
  status: OrderStatus | '';
};

const EMPTY_FORM: SearchForm = { orderNumber: '', shipperName: '', status: '' };

const DEFAULT_PARAMS: OrderListParams = {
  page: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export default function OrdersPage() {
  const [form, setForm] = useState<SearchForm>(EMPTY_FORM);
  const [params, setParams] = useState<OrderListParams>(DEFAULT_PARAMS);
  const { data, isPending, isError, error } = useOrders(params);

  const applySearch = () => {
    setParams((current) => ({
      ...current,
      page: 1,
      orderNumber: form.orderNumber.trim() || undefined,
      shipperName: form.shipperName.trim() || undefined,
      status: form.status || undefined,
    }));
  };

  const clearSearch = () => {
    setForm(EMPTY_FORM);
    setParams(DEFAULT_PARAMS);
  };

  const changeSort = (sortBy: OrderListParams['sortBy'], sortOrder: SortOrder) => {
    setParams((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">出荷オーダー一覧</h1>
        <Link
          href="/orders/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          出荷オーダー登録
        </Link>
      </div>

      <form
        className="rounded-lg border border-slate-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch();
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="オーダー番号" htmlFor="orderNumber">
            <TextInput
              id="orderNumber"
              value={form.orderNumber}
              placeholder="オーダー番号を入力"
              onChange={(event) => setForm({ ...form, orderNumber: event.target.value })}
            />
          </Field>
          <Field label="荷主" htmlFor="shipperName">
            <TextInput
              id="shipperName"
              value={form.shipperName}
              placeholder="荷主名を入力"
              onChange={(event) => setForm({ ...form, shipperName: event.target.value })}
            />
          </Field>
          <Field label="ステータス" htmlFor="status">
            <Select
              id="status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as OrderStatus | '' })
              }
            >
              <option value="">すべて</option>
              {Object.values(ORDER_STATUS).map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit">検索</Button>
          <Button type="button" variant="secondary" onClick={clearSearch}>
            クリア
          </Button>
        </div>
      </form>

      {isPending ? <LoadingPanel /> : null}
      {isError ? <ErrorAlert title={error.message} /> : null}

      {data ? (
        <>
          <p className="text-sm text-slate-600">全 {formatNumber(data.total)} 件</p>

          {data.items.length === 0 ? (
            <InfoPanel>該当する出荷オーダーがありません。</InfoPanel>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs">
                    <tr>
                      <SortableHeader
                        label="オーダー番号"
                        sortKey="orderNumber"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                      <TableHeader>荷主</TableHeader>
                      <TableHeader>出荷先</TableHeader>
                      <TableHeader align="right">商品点数</TableHeader>
                      <TableHeader>ステータス</TableHeader>
                      <SortableHeader
                        label="希望出荷日"
                        sortKey="requestedShipDate"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                      <SortableHeader
                        label="登録日時"
                        sortKey="createdAt"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{order.shipper.name}</td>
                        <td className="px-4 py-3 text-slate-700">{order.destinationName}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{order.itemCount}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(order.requestedShipDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={(page) => setParams((current) => ({ ...current, page }))}
                onPageSizeChange={(pageSize) =>
                  setParams((current) => ({ ...current, pageSize, page: 1 }))
                }
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
