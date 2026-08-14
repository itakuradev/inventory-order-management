/**
 * Application層がTransaction境界を宣言するためのポート。
 *
 * 抽象クラスにしているのはNestJSのDIトークンとして使うため。
 * Application層をPrismaへ依存させないことが目的で、実装はinfrastructure側に置く。
 */
export abstract class TransactionRunner {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
