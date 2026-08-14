import { z } from 'zod';
import { optionalTrimmedString, paginationQuerySchema, sortOrderSchema } from './common';
import { orderStatusSchema, type OrderStatus } from './enums';
import type { ShipperView } from './masters';

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), '存在しない日付です');

export const createOrderItemSchema = z.object({
  productId: z.string().min(1, '商品を選択してください'),
  quantity: z
    .number({ message: '数量を入力してください' })
    .int('数量は整数で入力してください')
    .min(1, '数量は1以上で入力してください'),
});

export const createOrderRequestSchema = z
  .object({
    shipperId: z.string().min(1, '荷主を選択してください'),
    destinationName: z.string().trim().min(1, '出荷先名称を入力してください').max(200),
    destinationAddress: z.string().trim().min(1, '出荷先住所を入力してください').max(500),
    requestedShipDate: isoDateSchema,
    items: z.array(createOrderItemSchema).min(1, '商品を1件以上追加してください').max(50),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.items.forEach((item, index) => {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'productId'],
          message: '同じ商品が重複しています',
        });
      }
      seen.add(item.productId);
    });
  });

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const orderSortKeySchema = z.enum(['orderNumber', 'requestedShipDate', 'createdAt']);
export type OrderSortKey = z.infer<typeof orderSortKeySchema>;

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  orderNumber: optionalTrimmedString,
  shipperName: optionalTrimmedString,
  status: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    orderStatusSchema.optional(),
  ),
  sortBy: orderSortKeySchema.default('createdAt'),
  sortOrder: sortOrderSchema.default('desc'),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export type OrderSummary = {
  id: string;
  orderNumber: string;
  shipper: ShipperView;
  destinationName: string;
  /** 明細行数（品目数） */
  itemCount: number;
  status: OrderStatus;
  /** YYYY-MM-DD */
  requestedShipDate: string;
  /** ISO 8601 */
  createdAt: string;
};

export type OrderItemView = {
  id: string;
  product: { id: string; sku: string; name: string; unit: string };
  quantity: number;
  /** 有効なAllocationの合計。キャンセル後は0になる。 */
  allocatedQuantity: number;
};

export type OrderDetail = OrderSummary & {
  destinationAddress: string;
  createdByUserName: string;
  /** ISO 8601 */
  updatedAt: string;
  items: OrderItemView[];
};
