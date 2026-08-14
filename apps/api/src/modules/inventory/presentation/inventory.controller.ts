import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  USER_ROLE,
  adjustInventoryRequestSchema,
  listInventoriesQuerySchema,
  type AdjustInventoryRequest,
  type InventoryView,
  type ListInventoriesQuery,
  type Paginated,
} from '@logimaster/contracts';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequireRoles } from '../../auth/roles.decorator';
import { AdjustInventoryUseCase } from '../application/adjust-inventory.usecase';
import { InventoryQueryService } from '../application/inventory-query.service';

@Controller('inventories')
export class InventoryController {
  constructor(
    private readonly inventoryQueryService: InventoryQueryService,
    private readonly adjustInventoryUseCase: AdjustInventoryUseCase,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listInventoriesQuerySchema)) query: ListInventoriesQuery,
  ): Promise<Paginated<InventoryView>> {
    return this.inventoryQueryService.list(user.organizationId, query);
  }

  /** 実在庫の調整はADMINのみ。OPERATORが直接APIを実行した場合もRolesGuardで拒否される。 */
  @Post(':inventoryId/adjustments')
  @RequireRoles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('inventoryId') inventoryId: string,
    @Body(new ZodValidationPipe(adjustInventoryRequestSchema)) body: AdjustInventoryRequest,
  ): Promise<void> {
    await this.adjustInventoryUseCase.execute({
      organizationId: user.organizationId,
      inventoryId,
      onHandQuantity: body.onHandQuantity,
    });
  }
}
