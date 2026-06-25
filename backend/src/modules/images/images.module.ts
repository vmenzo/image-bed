import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { ImagesController, PublicImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [
    SettingsModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'image-processing',
    }),
  ],
  controllers: [ImagesController, PublicImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
