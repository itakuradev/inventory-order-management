'use client';

import { API_ERROR_CODE, type InsufficientStockDetails } from '@logimaster/contracts';
import { ErrorAlert } from '@/components/ui/feedback';
import { ApiError } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';

function toShortages(error: ApiError): InsufficientStockDetails['shortages'] {
  if (error.body.code !== API_ERROR_CODE.INSUFFICIENT_STOCK) {
    return [];
  }
  const details = error.body.details as InsufficientStockDetails | undefined;
  return details?.shortages ?? [];
}

/** APIが返した業務エラーを表示する。判定はサーバー側の結果をそのまま用いる。 */
export function ApiErrorAlert({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) {
    return <ErrorAlert title="処理に失敗しました" />;
  }

  const shortages = toShortages(error);

  return (
    <ErrorAlert title={error.body.message}>
      {shortages.length > 0 ? (
        <ul className="list-inside list-disc space-y-0.5">
          {shortages.map((shortage) => (
            <li key={shortage.productId}>
              {shortage.sku} {shortage.productName}： 必要{' '}
              {formatNumber(shortage.requestedQuantity)} / 引当可能{' '}
              {formatNumber(shortage.availableQuantity)}
            </li>
          ))}
        </ul>
      ) : null}
    </ErrorAlert>
  );
}
