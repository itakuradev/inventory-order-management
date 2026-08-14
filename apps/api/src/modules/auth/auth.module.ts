import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { DemoAuthGuard } from './demo-auth.guard';
import { DemoUserRepository } from './demo-user.repository';
import { RolesGuard } from './roles.guard';

/**
 * すべてのエンドポイントへ認証・認可を適用する。
 * DemoAuthGuardを先に登録することで、RolesGuardは解決済みのcurrentUserを参照できる。
 */
@Module({
  controllers: [AuthController],
  providers: [
    DemoUserRepository,
    { provide: APP_GUARD, useClass: DemoAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [DemoUserRepository],
})
export class AuthModule {}
