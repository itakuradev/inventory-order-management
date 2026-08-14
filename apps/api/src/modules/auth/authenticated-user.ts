import type { DemoUserKey, UserRole } from '@logimaster/contracts';
import type { Request } from 'express';

/**
 * 認証方式に依存しない利用者情報。
 * Demo Authenticationを本認証へ差し替えても、この型より上の層は影響を受けない。
 */
export type AuthenticatedUser = {
  id: string;
  demoKey: DemoUserKey;
  name: string;
  role: UserRole;
  organizationId: string;
};

export type AuthenticatedRequest = Request & {
  currentUser?: AuthenticatedUser;
};
