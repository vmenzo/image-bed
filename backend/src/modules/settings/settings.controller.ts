import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/current-user.decorator';
import { AdminGuard } from '../../common/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TestEmailDto } from './dto/test-email.dto';
import { UpdateAppSettingDto } from './dto/update-app-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('app')
  get(@CurrentUser() user: CurrentUserPayload) {
    if (user.role !== 'ADMIN') {
      return this.settings.getUploadPolicy(user.id);
    }

    return this.settings.get(user.id);
  }

  @Patch('app')
  @UseGuards(AdminGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAppSettingDto,
  ) {
    return this.settings.update(user.id, dto);
  }

  @Post('app/storage-test')
  @UseGuards(AdminGuard)
  testStorage(@CurrentUser() user: CurrentUserPayload) {
    return this.settings.testStorage(user.id);
  }

  @Post('app/email-test')
  @UseGuards(AdminGuard)
  testEmail(@Body() dto: TestEmailDto) {
    return this.settings.testEmail(dto.email);
  }
}
