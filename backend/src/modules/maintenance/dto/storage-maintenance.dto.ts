import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MigrateImagesDto {
  @ApiPropertyOptional({ enum: StorageProvider })
  @IsEnum(StorageProvider)
  targetProvider: StorageProvider;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reprocess?: boolean;
}

export class ReprocessImagesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  missingOnly?: boolean;
}
