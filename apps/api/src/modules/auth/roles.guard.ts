import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@logimaster/contracts';
import { AuthenticationError, AuthorizationError } from '../../common/errors/application-errors';
import type { AuthenticatedRequest } from './authenticated-user';
import { REQUIRED_ROLES_KEY } from './roles.decorator';

/**
 * Authorizationはバックエンド側で保証する。
 * 画面側の表示制御にかかわらず、権限のないAPI呼び出しはここで拒否される。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { currentUser } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!currentUser) {
      throw new AuthenticationError('ログイン情報が確認できません');
    }

    if (!requiredRoles.includes(currentUser.role)) {
      throw new AuthorizationError('この操作を行う権限がありません');
    }

    return true;
  }
}
