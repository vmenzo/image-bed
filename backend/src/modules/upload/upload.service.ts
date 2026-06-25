import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { extension as extensionForMime } from 'mime-types';
import { customAlphabet } from 'nanoid';
import {
  ImageStatus,
  Prisma,
  StorageProvider,
  Visibility,
} from '@prisma/client';
import sharp = require('sharp');
import { lookup as lookupDns } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  StorageRuntimeConfig,
  StorageService,
} from '../storage/storage.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadDto } from './dto/create-upload.dto';
import { ImportUrlDto } from './dto/import-url.dto';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

type RuntimeUploadSetting = Awaited<ReturnType<SettingsService['getRuntime']>>;

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
    @InjectQueue('image-processing')
    private readonly processingQueue: Queue,
  ) {}

  async create(ownerId: string, dto: CreateUploadDto) {
    const setting = await this.settings.getRuntime(ownerId);
    const storageSetting = this.toStorageSetting({
      ...setting,
      storageProvider: dto.storageProvider ?? setting.storageProvider,
    });
    this.validateUploadPolicy(dto.contentType, dto.sizeBytes, setting);

    await this.ensureQuota(ownerId, dto.sizeBytes);

    if (dto.albumId) {
      await this.ensureAlbum(ownerId, dto.albumId);
    }

    const extension = this.resolveExtension(dto.contentType);
    const key = this.createStorageKey(ownerId, extension);
    const uploadUrl = await this.storage.createUploadUrl({
      key,
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      setting: storageSetting,
    });
    const image = await this.prisma.image.create({
      data: {
        ownerId,
        albumId: dto.albumId,
        title: dto.filename.replace(/\.[^/.]+$/, ''),
        originalName: dto.filename,
        mimeType: dto.contentType,
        extension,
        sizeBytes: dto.sizeBytes,
        storageProvider: storageSetting.storageProvider,
        storageKey: key,
        publicUrl: this.storage.getPublicUrlWithBase(key, storageSetting),
        visibility: dto.visibility ?? setting.defaultVisibility,
        status: ImageStatus.PENDING,
      },
    });

    return {
      imageId: image.id,
      key,
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': dto.contentType,
      },
      publicUrl: image.publicUrl,
      expiresIn: 900,
      storageProvider: image.storageProvider,
    };
  }

  async uploadObject(
    ownerId: string,
    key: string,
    body: Buffer,
    contentType: string,
  ) {
    const image = await this.prepareLocalObjectUpload(ownerId, key);

    if (body.length !== Number(image.sizeBytes)) {
      throw new BadRequestException('Uploaded object size does not match');
    }

    if (contentType && contentType !== image.mimeType) {
      throw new BadRequestException('Uploaded object type does not match');
    }

    await this.inspectImageBuffer(
      body,
      image.mimeType,
      BigInt(image.sizeBytes),
    );

    const setting = await this.settings.getRuntime(ownerId);
    const storageSetting = this.toStorageSetting(setting);
    await this.storage.putObject({
      key,
      body,
      contentType: image.mimeType,
      setting: {
        ...storageSetting,
        storageProvider: image.storageProvider,
      },
    });

    return { ok: true };
  }

  async prepareLocalObjectUpload(ownerId: string, key: string) {
    const image = await this.prisma.image.findUnique({
      where: { storageKey: key },
      select: {
        id: true,
        ownerId: true,
        mimeType: true,
        sizeBytes: true,
        storageProvider: true,
        status: true,
        uploadedAt: true,
      },
    });

    if (!image || image.ownerId !== ownerId) {
      throw new ForbiddenException('Image is not accessible');
    }

    if (image.storageProvider !== StorageProvider.LOCAL) {
      throw new BadRequestException('Image is not configured for local upload');
    }

    if (image.status !== ImageStatus.PENDING || image.uploadedAt) {
      throw new BadRequestException('Upload has already been completed');
    }

    return {
      ...image,
      sizeBytes: Number(image.sizeBytes),
    };
  }

  async complete(ownerId: string, id: string, dto: CompleteUploadDto) {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (!image || image.ownerId !== ownerId) {
      throw new ForbiddenException('Image is not accessible');
    }

    if (image.status !== ImageStatus.PENDING || image.uploadedAt) {
      throw new BadRequestException('Upload has already been completed');
    }

    const setting = await this.settings.getRuntime(ownerId);
    await this.verifyStoredObject(image, this.toStorageSetting(setting));
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.image.updateMany({
        where: {
          id,
          ownerId,
          status: ImageStatus.PENDING,
          uploadedAt: null,
        },
        data: {
          status: setting.uploadAudit
            ? ImageStatus.PENDING
            : ImageStatus.PROCESSING,
          uploadedAt: new Date(),
          checksum: dto.checksum,
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException('Upload has already been completed');
      }

      await this.incrementUsageWithinQuota(tx, ownerId, image.sizeBytes);

      return tx.image.findUniqueOrThrow({
        where: { id },
      });
    });

    if (!setting.uploadAudit) {
      await this.processingQueue.add('process-image', {
        imageId: updated.id,
        storageKey: updated.storageKey,
      });
    }

    return {
      ...updated,
      sizeBytes: Number(updated.sizeBytes),
    };
  }

  async importUrl(ownerId: string, dto: ImportUrlDto) {
    const runtimeSetting = await this.settings.getRuntime(ownerId);
    const setting = {
      ...runtimeSetting,
      storageProvider: dto.storageProvider ?? runtimeSetting.storageProvider,
    };
    if (!setting.apiUpload) {
      throw new ForbiddenException('API upload is disabled');
    }

    if (dto.albumId) {
      await this.ensureAlbum(ownerId, dto.albumId);
    }

    const response = await this.fetchImportUrl(dto.url);

    if (!response.ok) {
      throw new BadRequestException('Remote image is not accessible');
    }

    const contentType =
      response.headers.get('content-type')?.split(';')[0] ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength) {
      this.validateUploadPolicy(contentType, contentLength, setting);
    }

    const buffer = await this.readRemoteImage(response, setting.maxSizeBytes);
    this.validateUploadPolicy(contentType, buffer.length, setting);
    await this.inspectImageBuffer(buffer, contentType, BigInt(buffer.length));

    const filename =
      dto.filename?.trim() ||
      this.filenameFromUrl(dto.url) ||
      `remote-${new Date().getTime()}`;

    return this.createFromBuffer(ownerId, {
      filename,
      contentType,
      body: buffer,
      albumId: dto.albumId,
      visibility: dto.visibility,
      setting,
    });
  }

  async createFromBuffer(
    ownerId: string,
    input: {
      filename: string;
      contentType: string;
      body: Buffer;
      albumId?: string | null;
      visibility?: Visibility;
      setting?: RuntimeUploadSetting & { storageProvider?: StorageProvider };
    },
  ) {
    const setting = input.setting ?? (await this.settings.getRuntime(ownerId));
    this.validateUploadPolicy(input.contentType, input.body.length, setting);
    await this.inspectImageBuffer(
      input.body,
      input.contentType,
      BigInt(input.body.length),
    );
    await this.ensureQuota(ownerId, input.body.length);

    if (input.albumId) {
      await this.ensureAlbum(ownerId, input.albumId);
    }

    const extension = this.resolveExtension(input.contentType);
    const key = this.createStorageKey(ownerId, extension);
    const storageSetting = this.toStorageSetting(setting);

    await this.storage.putObject({
      key,
      body: input.body,
      contentType: input.contentType,
      setting: storageSetting,
    });

    try {
      const image = await this.prisma.$transaction(async (tx) => {
        await this.incrementUsageWithinQuota(
          tx,
          ownerId,
          BigInt(input.body.length),
        );

        return tx.image.create({
          data: {
            ownerId,
            albumId: input.albumId || undefined,
            title: input.filename.replace(/\.[^/.]+$/, ''),
            originalName: input.filename,
            mimeType: input.contentType,
            extension,
            sizeBytes: input.body.length,
            storageProvider: storageSetting.storageProvider,
            storageKey: key,
            publicUrl: this.storage.getPublicUrlWithBase(key, storageSetting),
            visibility: input.visibility ?? setting.defaultVisibility,
            status: setting.uploadAudit
              ? ImageStatus.PENDING
              : ImageStatus.PROCESSING,
            uploadedAt: new Date(),
          },
        });
      });

      if (!setting.uploadAudit) {
        await this.processingQueue.add('process-image', {
          imageId: image.id,
          storageKey: image.storageKey,
        });
      }

      return {
        ...image,
        sizeBytes: Number(image.sizeBytes),
      };
    } catch (error) {
      await this.storage
        .deleteObject(key, storageSetting)
        .catch(() => undefined);
      throw error;
    }
  }

  private async verifyStoredObject(
    image: {
      id: string;
      ownerId: string;
      mimeType: string;
      sizeBytes: bigint;
      storageKey: string;
      storageProvider: StorageProvider;
    },
    setting: StorageRuntimeConfig,
  ) {
    try {
      const buffer = await this.storage.getObjectBuffer(image.storageKey, {
        ...setting,
        storageProvider: image.storageProvider,
      });
      await this.inspectImageBuffer(buffer, image.mimeType, image.sizeBytes);
    } catch (error) {
      await this.storage
        .deleteObject(image.storageKey, {
          ...setting,
          storageProvider: image.storageProvider,
        })
        .catch(() => undefined);
      await this.prisma.image.update({
        where: { id: image.id },
        data: { status: ImageStatus.FAILED },
      });

      throw error;
    }
  }

  private async inspectImageBuffer(
    buffer: Buffer,
    expectedContentType: string,
    expectedSizeBytes: bigint,
  ) {
    if (buffer.length !== Number(expectedSizeBytes)) {
      throw new BadRequestException('Uploaded object size does not match');
    }

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(buffer, { failOn: 'error' }).metadata();
    } catch {
      throw new BadRequestException('Uploaded object is not a readable image');
    }
    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new BadRequestException('Uploaded object is not a readable image');
    }

    const actualContentType = this.contentTypeFromSharpFormat(metadata.format);
    if (!actualContentType || actualContentType !== expectedContentType) {
      throw new BadRequestException('Uploaded object type does not match');
    }

    const maxPixels = 80_000_000;
    if (metadata.width * metadata.height > maxPixels) {
      throw new BadRequestException('Image dimensions are too large');
    }
  }

  private validateUploadPolicy(
    contentType: string,
    sizeBytes: number,
    setting: {
      allowedTypes: string[];
      maxSizeBytes: number;
    },
  ) {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    if (
      setting.allowedTypes.length &&
      !setting.allowedTypes.includes(contentType)
    ) {
      throw new BadRequestException(`${contentType} is not allowed`);
    }

    if (sizeBytes > setting.maxSizeBytes) {
      throw new BadRequestException('Image exceeds max upload size');
    }
  }

  private async readRemoteImage(response: Response, maxSizeBytes: number) {
    if (!response.body) {
      throw new BadRequestException('Remote image body is empty');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value?.byteLength) {
        continue;
      }

      total += value.byteLength;
      if (total > maxSizeBytes) {
        throw new BadRequestException('Remote image exceeds max upload size');
      }
      chunks.push(value);
    }

    return Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      total,
    );
  }

  private async ensureQuota(ownerId: string, sizeBytes: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: {
        quotaBytes: true,
        usedBytes: true,
      },
    });

    if (user.usedBytes + BigInt(sizeBytes) > user.quotaBytes) {
      throw new ForbiddenException('Storage quota exceeded');
    }
  }

  private async incrementUsageWithinQuota(
    tx: Prisma.TransactionClient,
    ownerId: string,
    sizeBytes: bigint,
  ) {
    const affected = await tx.$executeRaw`
      UPDATE "User"
      SET "usedBytes" = "usedBytes" + ${sizeBytes}
      WHERE "id" = ${ownerId}
        AND "usedBytes" + ${sizeBytes} <= "quotaBytes"
    `;

    if (affected !== 1) {
      throw new ForbiddenException('Storage quota exceeded');
    }
  }

  private async ensureAlbum(ownerId: string, albumId: string) {
    const album = await this.prisma.album.findFirst({
      where: {
        id: albumId,
        ownerId,
      },
    });

    if (!album) {
      throw new ForbiddenException('Album is not accessible');
    }
  }

  private resolveExtension(contentType: string) {
    const extension = extensionForMime(contentType);
    if (extension && /^[a-z0-9]+$/.test(extension)) {
      return extension;
    }

    return 'bin';
  }

  private filenameFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      return last ? decodeURIComponent(last) : null;
    } catch {
      return null;
    }
  }

  private async fetchImportUrl(value: string) {
    let url = await this.parseImportUrl(value);

    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return response;
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new BadRequestException('Remote image redirect is invalid');
      }

      url = await this.parseImportUrl(new URL(location, url).toString());
    }

    throw new BadRequestException('Remote image has too many redirects');
  }

  private async parseImportUrl(value: string) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only HTTP(S) URLs are supported');
    }

    const addresses = await this.resolveImportHost(parsed.hostname);
    if (addresses.some((address) => this.isPrivateAddress(address))) {
      throw new BadRequestException('Private network URLs are not allowed');
    }

    return parsed.toString();
  }

  private async resolveImportHost(hostname: string) {
    const host = hostname.toLowerCase();
    if (isIP(host)) {
      return [host];
    }

    try {
      const records = await lookupDns(host, { all: true, verbatim: false });
      return records.map((record) => record.address);
    } catch {
      throw new BadRequestException('Remote host cannot be resolved');
    }
  }

  private isPrivateAddress(address: string) {
    const normalized = address.toLowerCase();
    if (
      normalized === 'localhost' ||
      normalized === '127.0.0.1' ||
      normalized === '0.0.0.0' ||
      normalized === '::1'
    ) {
      return true;
    }

    if (normalized.includes(':')) {
      return (
        normalized === '::' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
      );
    }

    return (
      normalized.startsWith('10.') ||
      normalized.startsWith('127.') ||
      normalized.startsWith('169.254.') ||
      normalized.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  private contentTypeFromSharpFormat(format: string) {
    return (
      {
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        avif: 'image/avif',
      }[format] ?? null
    );
  }

  private createStorageKey(ownerId: string, extension: string) {
    return `users/${ownerId}/${new Date().toISOString().slice(0, 10)}/${nanoid()}.${extension}`;
  }

  private toStorageSetting(
    setting: RuntimeUploadSetting,
  ): StorageRuntimeConfig {
    return {
      storageProvider: setting.storageProvider,
      publicBaseUrl: setting.publicBaseUrl,
      s3Endpoint: setting.s3Endpoint,
      s3Region: setting.s3Region,
      s3Bucket: setting.s3Bucket,
      s3AccessKey: setting.s3AccessKey,
      s3SecretKey: setting.s3SecretKey,
      s3ForcePathStyle: setting.s3ForcePathStyle,
      localStoragePath: setting.localStoragePath,
    };
  }
}
