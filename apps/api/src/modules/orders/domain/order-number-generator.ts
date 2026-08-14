/**
 * オーダー番号の採番。
 *
 * 日次連番は同時登録時に採番自体が競合するため、初期版では衝突しない
 * ランダム値（ULID）を用いる。生成方式を差し替えられるようポートとして定義する。
 */
export abstract class OrderNumberGenerator {
  abstract generate(): string;
}
