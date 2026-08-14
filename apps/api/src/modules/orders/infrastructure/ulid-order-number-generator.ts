import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { OrderNumberGenerator } from '../domain/order-number-generator';

@Injectable()
export class UlidOrderNumberGenerator extends OrderNumberGenerator {
  override generate(): string {
    return `SO-${ulid()}`;
  }
}
