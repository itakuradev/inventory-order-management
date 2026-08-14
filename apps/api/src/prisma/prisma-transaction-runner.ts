import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '../common/transaction/transaction-runner';
import { PrismaService } from './prisma.service';
import { TransactionContext } from './transaction-context';

@Injectable()
export class PrismaTransactionRunner extends TransactionRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TransactionContext,
  ) {
    super();
  }

  override run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => this.context.runWith(tx, work));
  }
}
