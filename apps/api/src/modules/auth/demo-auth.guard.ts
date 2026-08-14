import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DEMO_USER_HEADER, demoUserKeySchema } from '@logimaster/contracts';
import { AuthenticationError } from '../../common/errors/application-errors';
import type { AuthenticatedRequest } from './authenticated-user';
import { DemoUserRepository } from './demo-user.repository';

/**
 * Demo Authentication。
 * Next.jsが付与したDemo User識別子からUser・Role・Organizationを解決する。
 * 本認証を導入する際はこのGuardの差し替えのみで済むようにしている。
 */
@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(private readonly demoUserRepository: DemoUserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const headerValue = request.headers[DEMO_USER_HEADER];
    const demoKey = demoUserKeySchema.safeParse(
      Array.isArray(headerValue) ? headerValue[0] : headerValue,
    );

    if (!demoKey.success) {
      throw new AuthenticationError('ログイン情報が確認できません');
    }

    const user = await this.demoUserRepository.findByDemoKey(demoKey.data);
    if (!user) {
      throw new AuthenticationError('ログイン情報が確認できません');
    }

    request.currentUser = user;
    return true;
  }
}
