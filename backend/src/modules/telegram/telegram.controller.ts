import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/current-user.decorator';
import { AdminGuard } from '../../common/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get('status')
  status() {
    return this.telegram.status();
  }

  @Post('poll')
  poll() {
    return this.telegram.pollNow();
  }

  @Post('test')
  test(@CurrentUser() user: CurrentUserPayload) {
    return this.telegram.test(user.id);
  }
}
