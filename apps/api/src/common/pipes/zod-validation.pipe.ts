import { PipeTransform } from '@nestjs/common';
import { ZodType, z } from 'zod';
import { InputValidationError } from '../errors/application-errors';

/**
 * システム境界での入力形式検証。
 * 在庫充足やステータス遷移可否といった業務判断はここでは扱わない。
 */
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw new InputValidationError('入力内容に誤りがあります', z.treeifyError(result.error));
  }
}
