import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { API_ERROR_CODE, type ApiErrorBody, type ApiErrorCode } from '@logimaster/contracts';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import {
  AuthenticationError,
  AuthorizationError,
  BusinessRuleViolationError,
  InputValidationError,
  ResourceNotFoundError,
} from '../errors/application-errors';

type HttpErrorResponse = {
  status: number;
  body: ApiErrorBody;
};

const KNOWN_API_ERROR_CODES = new Set<string>(Object.values(API_ERROR_CODE));

/** これ以上のステータスはサーバー起因として扱い、スタックトレースを記録する。 */
const SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

const HTTP_STATUS_TO_ERROR_CODE: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODE.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODE.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODE.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODE.NOT_FOUND,
  [HttpStatus.CONFLICT]: API_ERROR_CODE.CONFLICT,
};

/**
 * 内部例外をそのままクライアントへ返さず、presentation層でHTTPレスポンスへ変換する。
 */
@Catch()
export class ApplicationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = this.toHttpError(exception);

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(body.message, exception instanceof Error ? exception.stack : undefined);
    }

    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toHttpError(exception: unknown): HttpErrorResponse {
    if (exception instanceof InputValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: API_ERROR_CODE.VALIDATION_FAILED,
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (exception instanceof AuthenticationError) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        body: { code: API_ERROR_CODE.UNAUTHENTICATED, message: exception.message },
      };
    }

    if (exception instanceof AuthorizationError) {
      return {
        status: HttpStatus.FORBIDDEN,
        body: { code: API_ERROR_CODE.FORBIDDEN, message: exception.message },
      };
    }

    if (exception instanceof ResourceNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: { code: API_ERROR_CODE.NOT_FOUND, message: exception.message },
      };
    }

    if (exception instanceof BusinessRuleViolationError) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          code: this.toApiErrorCode(exception.code),
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    if (this.isCheckConstraintViolation(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          code: API_ERROR_CODE.INVENTORY_INVARIANT_VIOLATION,
          message: 'データの整合性制約に違反したため処理を中止しました',
        },
      };
    }

    // ルート未定義などNestJSが直接投げる例外。ステータスに応じたコードを返す。
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          code: HTTP_STATUS_TO_ERROR_CODE[status] ?? API_ERROR_CODE.INTERNAL_ERROR,
          message: exception.message,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: API_ERROR_CODE.INTERNAL_ERROR,
        message: '予期しないエラーが発生しました',
      },
    };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): HttpErrorResponse {
    switch (exception.code) {
      case 'P2002':
      case 'P2003':
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: API_ERROR_CODE.CONFLICT,
            message: '他の処理と競合したため登録できませんでした',
          },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: { code: API_ERROR_CODE.NOT_FOUND, message: '対象のデータが見つかりません' },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: API_ERROR_CODE.INTERNAL_ERROR,
            message: '予期しないデータベースエラーが発生しました',
          },
        };
    }
  }

  /** DB側のCHECK制約違反。Domainでも同じ条件を検証しているため、ここは最終防衛線。 */
  private isCheckConstraintViolation(exception: unknown): boolean {
    return exception instanceof Error && exception.message.includes('violates check constraint');
  }

  private toApiErrorCode(code: string): ApiErrorCode {
    return KNOWN_API_ERROR_CODES.has(code) ? (code as ApiErrorCode) : API_ERROR_CODE.CONFLICT;
  }
}
