import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticationError } from '../../common/errors/application-errors';
import type { AuthenticatedRequest, AuthenticatedUser } from './authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const { currentUser } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!currentUser) {
      throw new AuthenticationError('ログイン情報が確認できません');
    }
    return currentUser;
  },
);
