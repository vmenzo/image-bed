import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { ImageProcessor } from './image.processor';

@Module({
  imports: [
    StorageModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'image-processing',
    }),
  ],
  providers: [ImageProcessor],
})
export class ProcessorModule {}
