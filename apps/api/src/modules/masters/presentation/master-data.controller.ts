import { Controller, Get, Query } from '@nestjs/common';
import {
  listProductsQuerySchema,
  type ListProductsQuery,
  type ProductView,
  type ShipperView,
} from '@logimaster/contracts';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MasterDataQueryService } from '../application/master-data-query.service';

@Controller()
export class MasterDataController {
  constructor(private readonly masterDataQueryService: MasterDataQueryService) {}

  @Get('shippers')
  listShippers(@CurrentUser() user: AuthenticatedUser): Promise<ShipperView[]> {
    return this.masterDataQueryService.listShippers(user.organizationId);
  }

  @Get('products')
  listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: ListProductsQuery,
  ): Promise<ProductView[]> {
    return this.masterDataQueryService.listProductsOfShipper(user.organizationId, query.shipperId);
  }
}
