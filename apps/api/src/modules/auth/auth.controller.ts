import { Controller, Get } from '@nestjs/common';
import type { MeResponse } from '@logimaster/contracts';
import type { AuthenticatedUser } from './authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { DemoUserRepository } from './demo-user.repository';

@Controller('me')
export class AuthController {
  constructor(private readonly demoUserRepository: DemoUserRepository) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.demoUserRepository.findProfile(user);
  }
}
