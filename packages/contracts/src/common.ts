import { z } from 'zod';

/** クエリ文字列の空文字は「未指定」として扱う。 */
export const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const API_ERROR_CODE = {
  /** 400 入力形式不正 */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** 401 Demo Userを解決できない */
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /** 403 権限不足 */
  FORBIDDEN: 'FORBIDDEN',
  /** 404 対象データ不存在 */
  NOT_FOUND: 'NOT_FOUND',
  /** 409 在庫不足 */
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  /** 409 許可されない状態遷移 */
  INVALID_ORDER_STATUS_TRANSITION: 'INVALID_ORDER_STATUS_TRANSITION',
  /** 409 在庫の不変条件違反 */
  INVENTORY_INVARIANT_VIOLATION: 'INVENTORY_INVARIANT_VIOLATION',
  /** 409 その他の業務エラー・競合 */
  CONFLICT: 'CONFLICT',
  /** 500 予期しないシステムエラー */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

/** 在庫不足時に、どの商品がどれだけ足りないかを特定するための情報。 */
export type StockShortage = {
  productId: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
};

export type InsufficientStockDetails = {
  shortages: StockShortage[];
};
