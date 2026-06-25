import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { UploadController } from './upload.controller';
import { UploadAuthGuard } from './upload-auth.guard';
import { UploadService } from './upload.service';

@Module({
  imports: [
    ApiKeysModule,
    AuthModule,
    StorageModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'image-processing',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, UploadAuthGuard],
  exports: [UploadService],
})
export class UploadModule {}
