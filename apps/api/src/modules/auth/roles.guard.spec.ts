import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLE, type UserRole } from '@logimaster/contracts';
import { AuthenticationError, AuthorizationError } from '../../common/errors/application-errors';
import type { AuthenticatedUser } from './authenticated-user';
import { RolesGuard } from './roles.guard';

const OPERATOR: AuthenticatedUser = {
  id: 'usr-1',
  demoKey: 'demo-operator',
  name: 'Demo OPERATOR',
  role: USER_ROLE.OPERATOR,
  organizationId: 'org-1',
};

const ADMIN: AuthenticatedUser = {
  id: 'usr-2',
  demoKey: 'demo-admin',
  name: 'Demo ADMIN',
  role: USER_ROLE.ADMIN,
  organizationId: 'org-1',
};

function createContext(currentUser: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ currentUser }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function createGuard(requiredRoles: UserRole[] | undefined): RolesGuard {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('ADMIN専用の操作をADMINは実行できる', () => {
    expect(createGuard([USER_ROLE.ADMIN]).canActivate(createContext(ADMIN))).toBe(true);
  });

  it('ADMIN専用の操作をOPERATORが直接実行した場合は拒否する', () => {
    expect(() => createGuard([USER_ROLE.ADMIN]).canActivate(createContext(OPERATOR))).toThrow(
      AuthorizationError,
    );
  });

  it('Roleの指定がない操作は認証済みであれば実行できる', () => {
    expect(createGuard(undefined).canActivate(createContext(OPERATOR))).toBe(true);
    expect(createGuard([]).canActivate(createContext(OPERATOR))).toBe(true);
  });

  it('利用者を解決できていない場合は認証エラーにする', () => {
    expect(() => createGuard([USER_ROLE.ADMIN]).canActivate(createContext(undefined))).toThrow(
      AuthenticationError,
    );
  });
});
