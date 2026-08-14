import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@logimaster/contracts';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

/** このハンドラーの実行に必要なRoleを宣言する。未指定の場合は認証済みであれば実行できる。 */
export const RequireRoles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
