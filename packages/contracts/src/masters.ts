import { z } from 'zod';

export type ShipperView = {
  id: string;
  code: string;
  name: string;
};

export type ProductView = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  shipperId: string;
};

export const listProductsQuerySchema = z.object({
  shipperId: z.string().min(1),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
