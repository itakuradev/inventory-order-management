import { z } from 'zod';
import { optionalTrimmedString, paginationQuerySchema, sortOrderSchema } from './common';
import type { ShipperView } from './masters';

export const inventorySortKeySchema = z.enum(['sku', 'productName', 'availableQuantity', 'updatedAt']);
export type InventorySortKey = z.infer<typeof inventorySortKeySchema>;

export const listInventoriesQuerySchema = paginationQuerySchema.extend({
  /** 商品No・商品名の部分一致 */
  keyword: optionalTrimmedString,
  shipperName: optionalTrimmedString,
  sortBy: inventorySortKeySchema.default('sku'),
  sortOrder: sortOrderSchema.default('asc'),
});

export type ListInventoriesQuery = z.infer<typeof listInventoriesQuerySchema>;

export const adjustInventoryRequestSchema = z.object({
  onHandQuantity: z
    .number({ message: '実在庫数を入力してください' })
    .int('実在庫数は整数で入力してください')
    .min(0, '実在庫数は0以上で入力してください'),
});

export type AdjustInventoryRequest = z.infer<typeof adjustInventoryRequestSchema>;

export type InventoryView = {
  id: string;
  product: { id: string; sku: string; name: string; unit: string };
  shipper: ShipperView;
  onHandQuantity: number;
  allocatedQuantity: number;
  /** onHandQuantity - allocatedQuantity。DBには保存しない。 */
  availableQuantity: number;
  /** ISO 8601 */
  updatedAt: string;
};
