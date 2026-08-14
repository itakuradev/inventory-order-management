import { Injectable } from '@nestjs/common';
import type { DemoUserKey, MeResponse, UserRole } from '@logimaster/contracts';
import { ResourceNotFoundError } from '../../common/errors/application-errors';
import { TransactionContext } from '../../prisma/transaction-context';
import type { AuthenticatedUser } from './authenticated-user';

@Injectable()
export class DemoUserRepository {
  constructor(private readonly context: TransactionContext) {}

  async findByDemoKey(demoKey: DemoUserKey): Promise<AuthenticatedUser | null> {
    const user = await this.context.executor.user.findUnique({ where: { demoKey } });
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      demoKey,
      name: user.name,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    };
  }

  /** 初期版はOrganization・Warehouseとも1件固定のため、所属組織の倉庫を先頭1件で解決する。 */
  async findProfile(user: AuthenticatedUser): Promise<MeResponse> {
    const organization = await this.context.executor.organization.findUnique({
      where: { id: user.organizationId },
      include: { warehouses: { orderBy: { code: 'asc' }, take: 1 } },
    });

    const warehouse = organization?.warehouses[0];
    if (!organization || !warehouse) {
      throw new ResourceNotFoundError('組織または物流センターの情報が見つかりません');
    }

    return {
      id: user.id,
      demoKey: user.demoKey,
      name: user.name,
      role: user.role,
      organization: { id: organization.id, name: organization.name },
      warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
    };
  }
}
