import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { StorageProvider, Visibility } from '@prisma/client';

export class CreateUploadDto {
  @ApiProperty({ example: 'screenshot.png' })
  @IsString()
  @MinLength(1)
  filename: string;

  @ApiProperty({ example: 'image/png' })
  @IsMimeType()
  contentType: string;

  @ApiProperty({ example: 512000 })
  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024)
  sizeBytes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ enum: StorageProvider })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;
}
