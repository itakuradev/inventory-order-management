'use client';

import { useState } from 'react';
import { adjustInventoryRequestSchema, type InventoryView } from '@logimaster/contracts';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/form';
import { ApiErrorAlert } from '@/features/orders/api-error-alert';
import { formatNumber } from '@/lib/format';
import { toFieldErrors } from '@/lib/zod-error';
import { useAdjustInventory } from './use-inventories';

/** ADMIN専用の実在庫調整。指定した値で実在庫を上書きする。 */
export function AdjustInventoryDialog({
  inventory,
  onClose,
}: {
  inventory: InventoryView;
  onClose: () => void;
}) {
  const [onHandQuantity, setOnHandQuantity] = useState(String(inventory.onHandQuantity));
  const [fieldError, setFieldError] = useState<string>();
  const adjustInventory = useAdjustInventory();

  const submit = () => {
    const parsed = adjustInventoryRequestSchema.safeParse({
      onHandQuantity: onHandQuantity === '' ? Number.NaN : Number(onHandQuantity),
    });

    if (!parsed.success) {
      setFieldError(toFieldErrors(parsed.error).onHandQuantity);
      return;
    }

    setFieldError(undefined);
    adjustInventory.mutate(
      { inventoryId: inventory.id, request: parsed.data },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-inventory-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <h2 id="adjust-inventory-title" className="text-lg font-semibold text-slate-900">
          実在庫の調整
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {inventory.product.sku} {inventory.product.name}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-3 text-sm">
          <div>
            <dt className="text-slate-500">実在庫</dt>
            <dd className="font-medium text-slate-900">
              {formatNumber(inventory.onHandQuantity)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">引当済</dt>
            <dd className="font-medium text-slate-900">
              {formatNumber(inventory.allocatedQuantity)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">引当可能</dt>
            <dd className="font-medium text-slate-900">
              {formatNumber(inventory.availableQuantity)}
            </dd>
          </div>
        </dl>

        {adjustInventory.isError ? (
          <div className="mt-4">
            <ApiErrorAlert error={adjustInventory.error} />
          </div>
        ) : null}

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field
            label="調整後の実在庫"
            htmlFor="onHandQuantity"
            required
            error={fieldError}
          >
            <TextInput
              id="onHandQuantity"
              type="number"
              min={0}
              step={1}
              autoFocus
              value={onHandQuantity}
              onChange={(event) => setOnHandQuantity(event.target.value)}
            />
          </Field>
          <p className="text-xs text-slate-500">
            引当済数量（{formatNumber(inventory.allocatedQuantity)}）を下回る値は登録できません。
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={adjustInventory.isPending}
            >
              閉じる
            </Button>
            <Button type="submit" disabled={adjustInventory.isPending}>
              {adjustInventory.isPending ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
