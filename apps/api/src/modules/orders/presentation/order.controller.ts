import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  createOrderRequestSchema,
  listOrdersQuerySchema,
  type CreateOrderRequest,
  type ListOrdersQuery,
  type OrderDetail,
  type OrderSummary,
  type Paginated,
} from '@logimaster/contracts';
import { ResourceNotFoundError } from '../../../common/errors/application-errors';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CancelOrderUseCase } from '../application/cancel-order.usecase';
import { CreateOrderUseCase } from '../application/create-order.usecase';
import { HandOverOrderUseCase } from '../application/hand-over-order.usecase';
import { OrderQueryService } from '../application/order-query.service';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderQueryService: OrderQueryService,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly handOverOrderUseCase: HandOverOrderUseCase,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listOrdersQuerySchema)) query: ListOrdersQuery,
  ): Promise<Paginated<OrderSummary>> {
    return this.orderQueryService.list(user.organizationId, query);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrderRequestSchema)) body: CreateOrderRequest,
  ): Promise<OrderDetail> {
    const { orderId } = await this.createOrderUseCase.execute({
      organizationId: user.organizationId,
      createdByUserId: user.id,
      shipperId: body.shipperId,
      destinationName: body.destinationName,
      destinationAddress: body.destinationAddress,
      requestedShipDate: body.requestedShipDate,
      items: body.items,
    });

    return this.findDetailOrFail(user.organizationId, orderId);
  }

  @Get(':orderId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderDetail> {
    return this.findDetailOrFail(user.organizationId, orderId);
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<void> {
    await this.cancelOrderUseCase.execute({ organizationId: user.organizationId, orderId });
  }

  @Post(':orderId/hand-over')
  @HttpCode(HttpStatus.NO_CONTENT)
  async handOver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<void> {
    await this.handOverOrderUseCase.execute({ organizationId: user.organizationId, orderId });
  }

  private async findDetailOrFail(organizationId: string, orderId: string): Promise<OrderDetail> {
    const detail = await this.orderQueryService.findDetail(organizationId, orderId);
    if (!detail) {
      throw new ResourceNotFoundError('対象の出荷オーダーが見つかりません');
    }
    return detail;
  }
}
