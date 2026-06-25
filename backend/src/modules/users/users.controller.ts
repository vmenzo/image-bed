import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AdminGuard } from '../../common/admin.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ResetUserPasswordDto,
  UpdateUserAdminDto,
} from './dto/update-user-admin.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('disabled') disabled?: string,
  ) {
    return this.users.list({
      page: this.positiveInt(page),
      pageSize: this.positiveInt(pageSize),
      q,
      role: this.userRole(role),
      disabled:
        disabled === undefined ? undefined : ['true', '1'].includes(disabled),
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @Req() request: Request,
  ) {
    return this.users.update(user.id, id, dto, {
      actorId: user.id,
      request,
    });
  }

  @Post(':id/reset-password')
  resetPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @Req() request: Request,
  ) {
    return this.users.resetPassword(id, dto, {
      actorId: user.id,
      request,
    });
  }

  @Post(':id/recalculate-usage')
  recalcUsage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    return this.users.recalcUsage(id, {
      actorId: user.id,
      request,
    });
  }

  private positiveInt(value?: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private userRole(value?: string) {
    return Object.values(UserRole).includes(value as UserRole)
      ? (value as UserRole)
      : undefined;
  }
}
