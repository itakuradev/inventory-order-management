import { z } from 'zod';
import { userRoleSchema, type UserRole } from './enums';

/** Next.jsがDemo Userを識別させるために付与するHTTPヘッダー。 */
export const DEMO_USER_HEADER = 'x-demo-user-key';

export const DEMO_USER_KEY = {
  OPERATOR: 'demo-operator',
  ADMIN: 'demo-admin',
} as const;

export type DemoUserKey = (typeof DEMO_USER_KEY)[keyof typeof DEMO_USER_KEY];

export const demoUserKeySchema = z.enum([DEMO_USER_KEY.OPERATOR, DEMO_USER_KEY.ADMIN]);

export type MeResponse = {
  id: string;
  demoKey: DemoUserKey;
  name: string;
  role: UserRole;
  organization: { id: string; name: string };
  warehouse: { id: string; code: string; name: string };
};

export const meResponseRoleSchema = userRoleSchema;
