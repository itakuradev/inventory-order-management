'use client';

import { useState } from 'react';
import { USER_ROLE, type InventoryView, type SortOrder } from '@logimaster/contracts';
import { Button } from '@/components/ui/button';
import { ErrorAlert, InfoPanel, LoadingPanel } from '@/components/ui/feedback';
import { Field, TextInput } from '@/components/ui/form';
import { Pagination, SortableHeader, TableHeader } from '@/components/ui/table';
import { useMe } from '@/features/auth/use-me';
import { AdjustInventoryDialog } from '@/features/inventories/adjust-inventory-dialog';
import { useInventories, type InventoryListParams } from '@/features/inventories/use-inventories';
import { formatDateTime, formatNumber } from '@/lib/format';

type SearchForm = {
  keyword: string;
  shipperName: string;
};

const EMPTY_FORM: SearchForm = { keyword: '', shipperName: '' };

const DEFAULT_PARAMS: InventoryListParams = {
  page: 1,
  pageSize: 10,
  sortBy: 'sku',
  sortOrder: 'asc',
};

export default function InventoriesPage() {
  const { data: me } = useMe();
  const [form, setForm] = useState<SearchForm>(EMPTY_FORM);
  const [params, setParams] = useState<InventoryListParams>(DEFAULT_PARAMS);
  const [adjustTarget, setAdjustTarget] = useState<InventoryView | null>(null);

  const { data, isPending, isError, error } = useInventories(params);
  const isAdmin = me?.role === USER_ROLE.ADMIN;

  const applySearch = () => {
    setParams((current) => ({
      ...current,
      page: 1,
      keyword: form.keyword.trim() || undefined,
      shipperName: form.shipperName.trim() || undefined,
    }));
  };

  const clearSearch = () => {
    setForm(EMPTY_FORM);
    setParams(DEFAULT_PARAMS);
  };

  const changeSort = (sortBy: InventoryListParams['sortBy'], sortOrder: SortOrder) => {
    setParams((current) => ({ ...current, sortBy, sortOrder, page: 1 }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">在庫一覧</h1>
        {isAdmin ? (
          <p className="text-sm text-slate-500">管理者は実在庫の調整を行えます。</p>
        ) : null}
      </div>

      <form
        className="rounded-lg border border-slate-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch();
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="商品No・商品名" htmlFor="keyword">
            <TextInput
              id="keyword"
              value={form.keyword}
              placeholder="商品Noまたは商品名を入力"
              onChange={(event) => setForm({ ...form, keyword: event.target.value })}
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
            <InfoPanel>該当する在庫がありません。</InfoPanel>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs">
                    <tr>
                      <SortableHeader
                        label="商品No"
                        sortKey="sku"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                      <SortableHeader
                        label="商品名"
                        sortKey="productName"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                      <TableHeader>荷主</TableHeader>
                      <TableHeader>単位</TableHeader>
                      <TableHeader align="right">実在庫</TableHeader>
                      <TableHeader align="right">引当済</TableHeader>
                      <TableHeader align="right">引当可能</TableHeader>
                      <SortableHeader
                        label="最終更新日時"
                        sortKey="updatedAt"
                        currentKey={params.sortBy}
                        currentOrder={params.sortOrder}
                        onChange={changeSort}
                      />
                      {isAdmin ? <TableHeader>操作</TableHeader> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((inventory) => (
                      <tr key={inventory.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{inventory.product.sku}</td>
                        <td className="px-4 py-3 text-slate-900">{inventory.product.name}</td>
                        <td className="px-4 py-3 text-slate-700">{inventory.shipper.name}</td>
                        <td className="px-4 py-3 text-slate-700">{inventory.product.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {formatNumber(inventory.onHandQuantity)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {formatNumber(inventory.allocatedQuantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatNumber(inventory.availableQuantity)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateTime(inventory.updatedAt)}
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setAdjustTarget(inventory)}
                            >
                              在庫調整
                            </Button>
                          </td>
                        ) : null}
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

      {adjustTarget ? (
        <AdjustInventoryDialog
          inventory={adjustTarget}
          onClose={() => setAdjustTarget(null)}
        />
      ) : null}
    </div>
  );
}
