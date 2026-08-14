import { Module } from '@nestjs/common';
import { MasterDataQueryService } from './application/master-data-query.service';
import { PrismaMasterDataQueryService } from './infrastructure/prisma-master-data-query.service';
import { MasterDataController } from './presentation/master-data.controller';

@Module({
  controllers: [MasterDataController],
  providers: [{ provide: MasterDataQueryService, useClass: PrismaMasterDataQueryService }],
})
export class MastersModule {}
