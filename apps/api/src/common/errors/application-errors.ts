/**
 * 業務・アプリケーション上のエラー階層。
 *
 * HTTPステータスやAPIエラーコードへの変換はpresentation層（例外フィルター）が担当する。
 * ここではHTTPに依存しない意味だけを表現する。
 */
export abstract class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** システム境界での入力形式エラー。 */
export class InputValidationError extends ApplicationError {
  constructor(
    message: string,
    readonly details: unknown,
  ) {
    super(message);
  }
}

/** Demo Userを解決できない等、利用者を特定できない状態。 */
export class AuthenticationError extends ApplicationError {}

/** 利用者は特定できるが、その操作を行う権限がない状態。 */
export class AuthorizationError extends ApplicationError {}

/** 指定された対象データが存在しない。 */
export class ResourceNotFoundError extends ApplicationError {}

/**
 * 業務ルール違反。入力形式は正しいが、業務上その操作が許可されない場合に使う。
 *
 * `code` は各domainが定義する意味的なコードで、presentation層がAPIエラーコードへ対応付ける。
 */
export abstract class BusinessRuleViolationError extends ApplicationError {
  abstract readonly code: string;
  readonly details?: unknown;
}
