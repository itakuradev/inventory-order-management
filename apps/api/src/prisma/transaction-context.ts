import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/** RepositoryがPrismaへ発行するクエリの実行クライアント。Transaction中はtxクライアントになる。 */
export type PrismaExecutor = Prisma.TransactionClient;

/**
 * 実行中のTransactionをAsyncLocalStorageで保持する。
 *
 * Repositoryの各メソッドへtxクライアントを引数で引き回すとApplication層に
 * Prismaの都合が漏れるため、実行文脈として持たせる方式を採用した。
 */
@Injectable()
export class TransactionContext {
  private readonly storage = new AsyncLocalStorage<PrismaExecutor>();

  constructor(private readonly prisma: PrismaService) {}

  runWith<T>(transactionClient: PrismaExecutor, work: () => Promise<T>): Promise<T> {
    return this.storage.run(transactionClient, work);
  }

  /** Transaction中はtxクライアント、そうでなければ通常のPrismaClientを返す。 */
  get executor(): PrismaExecutor {
    return this.storage.getStore() ?? this.prisma;
  }
}
