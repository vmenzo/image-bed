import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
  StreamableFile,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { StorageProvider } from '@prisma/client';
import { lookup } from 'mime-types';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { StorageRuntimeConfig, StorageService } from './storage.service';

@Controller('public/files')
export class PublicFilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settings: SettingsService,
  ) {}

  @Get('*path')
  async file(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const key = this.getKey(request);
    const ownerId = key.split('/')[1];

    if (!key.startsWith('users/') || !ownerId) {
      throw new NotFoundException('File not found');
    }

    await this.ensureKnownFile(key);

    const setting = await this.settings.getRuntime(ownerId);
    const storageSetting: StorageRuntimeConfig = {
      ...setting,
      storageProvider: StorageProvider.LOCAL,
    };
    const stream = await this.storage.createReadStreamIfExists(
      key,
      storageSetting,
    );

    if (!stream) {
      throw new NotFoundException('File not found');
    }

    response.set({
      'Content-Type': lookup(key) || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return new StreamableFile(stream);
  }

  private async ensureKnownFile(key: string) {
    const image = await this.prisma.image.findFirst({
      where: {
        OR: [
          { storageKey: key },
          { thumbKey: key },
          { webpKey: key },
          { avifKey: key },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!image) {
      throw new NotFoundException('File not found');
    }
  }

  private getKey(request: Request) {
    const params = request.params as Record<
      string,
      string | string[] | undefined
    >;
    const raw = params.path ?? params[0] ?? request.url.replace(/^\//, '');
    const key = Array.isArray(raw) ? raw.join('/') : String(raw);

    try {
      return decodeURIComponent(key);
    } catch {
      return key;
    }
  }
}
