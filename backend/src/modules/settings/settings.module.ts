import { forwardRef, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { MailModule } from '../mail/mail.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [forwardRef(() => StorageModule), MailModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
