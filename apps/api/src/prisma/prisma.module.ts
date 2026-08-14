import { Global, Module } from '@nestjs/common';
import { TransactionRunner } from '../common/transaction/transaction-runner';
import { PrismaTransactionRunner } from './prisma-transaction-runner';
import { PrismaService } from './prisma.service';
import { TransactionContext } from './transaction-context';

@Global()
@Module({
  providers: [
    PrismaService,
    TransactionContext,
    { provide: TransactionRunner, useClass: PrismaTransactionRunner },
  ],
  exports: [PrismaService, TransactionContext, TransactionRunner],
})
export class PrismaModule {}
