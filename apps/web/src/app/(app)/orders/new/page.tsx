'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createOrderRequestSchema } from '@logimaster/contracts';
import { Button } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/form';
import { ApiErrorAlert } from '@/features/orders/api-error-alert';
import { useCreateOrder } from '@/features/orders/use-orders';
import { useProductsOfShipper, useShippers } from '@/features/masters/use-masters';
import { todayIsoDate } from '@/lib/format';
import { toFieldErrors } from '@/lib/zod-error';

type ItemRow = {
  key: number;
  productId: string;
  quantity: string;
};

const createEmptyRow = (key: number): ItemRow => ({ key, productId: '', quantity: '1' });

export default function NewOrderPage() {
  const router = useRouter();
  const shippers = useShippers();
  const createOrder = useCreateOrder();

  const [shipperId, setShipperId] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [requestedShipDate, setRequestedShipDate] = useState(todayIsoDate());
  const [items, setItems] = useState<ItemRow[]>([createEmptyRow(0)]);
  const [nextRowKey, setNextRowKey] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const products = useProductsOfShipper(shipperId);

  const changeShipper = (nextShipperId: string) => {
    setShipperId(nextShipperId);
    // 商品は荷主に属するため、荷主を変更したら選択済みの商品を破棄する。
    setItems([createEmptyRow(nextRowKey)]);
    setNextRowKey((key) => key + 1);
  };

  const updateItem = (key: number, patch: Partial<ItemRow>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    setItems((current) => [...current, createEmptyRow(nextRowKey)]);
    setNextRowKey((key) => key + 1);
  };

  const removeItem = (key: number) => {
    setItems((current) => (current.length <= 1 ? current : current.filter((i) => i.key !== key)));
  };

  const submit = () => {
    const parsed = createOrderRequestSchema.safeParse({
      shipperId,
      destinationName,
      destinationAddress,
      requestedShipDate,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity === '' ? Number.NaN : Number(item.quantity),
      })),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    createOrder.mutate(parsed.data, {
      onSuccess: (order) => router.push(`/orders/${order.id}`),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">出荷オーダー登録</h1>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          一覧へ戻る
        </Link>
      </div>

      {createOrder.isError ? <ApiErrorAlert error={createOrder.error} /> : null}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-800">オーダー情報</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="荷主" htmlFor="shipperId" required error={fieldErrors.shipperId}>
              <Select
                id="shipperId"
                value={shipperId}
                onChange={(event) => changeShipper(event.target.value)}
              >
                <option value="">選択してください</option>
                {(shippers.data ?? []).map((shipper) => (
                  <option key={shipper.id} value={shipper.id}>
                    {shipper.code} {shipper.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="希望出荷日"
              htmlFor="requestedShipDate"
              required
              error={fieldErrors.requestedShipDate}
            >
              <TextInput
                id="requestedShipDate"
                type="date"
                value={requestedShipDate}
                onChange={(event) => setRequestedShipDate(event.target.value)}
              />
            </Field>

            <Field
              label="出荷先名称"
              htmlFor="destinationName"
              required
              error={fieldErrors.destinationName}
            >
              <TextInput
                id="destinationName"
                value={destinationName}
                placeholder="例）みどり食品 大阪支店"
                onChange={(event) => setDestinationName(event.target.value)}
              />
            </Field>

            <Field
              label="出荷先住所"
              htmlFor="destinationAddress"
              required
              error={fieldErrors.destinationAddress}
            >
              <TextArea
                id="destinationAddress"
                rows={2}
                value={destinationAddress}
                placeholder="例）大阪府大阪市北区梅田1-1-1"
                onChange={(event) => setDestinationAddress(event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">商品</h2>
            <Button type="button" variant="secondary" onClick={addItem} disabled={shipperId === ''}>
              商品を追加
            </Button>
          </div>

          {shipperId === '' ? (
            <p className="text-sm text-slate-500">先に荷主を選択してください。</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.key} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                  <Field
                    label={`商品 ${index + 1}`}
                    htmlFor={`product-${item.key}`}
                    required
                    error={fieldErrors[`items.${index}.productId`]}
                  >
                    <Select
                      id={`product-${item.key}`}
                      value={item.productId}
                      onChange={(event) => updateItem(item.key, { productId: event.target.value })}
                    >
                      <option value="">選択してください</option>
                      {(products.data ?? []).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} {product.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="数量"
                    htmlFor={`quantity-${item.key}`}
                    required
                    error={fieldErrors[`items.${index}.quantity`]}
                  >
                    <TextInput
                      id={`quantity-${item.key}`}
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                    />
                  </Field>

                  <div className="flex items-end pb-1">
                    <Button
                      type="button"
                      variant="danger"
                      disabled={items.length <= 1}
                      onClick={() => removeItem(item.key)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fieldErrors.items ? (
            <p className="mt-2 text-xs text-red-600">{fieldErrors.items}</p>
          ) : null}
        </section>

        <div className="flex justify-end gap-2">
          <Link
            href="/orders"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </Link>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? '登録中...' : '登録して在庫を引き当てる'}
          </Button>
        </div>
      </form>
    </div>
  );
}
