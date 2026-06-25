import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { UploadModule } from '../upload/upload.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [SettingsModule, UploadModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
