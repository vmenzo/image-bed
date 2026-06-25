import { forwardRef, Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PublicFilesController } from './public-files.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  controllers: [PublicFilesController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
