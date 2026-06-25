import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ImageStatus, Visibility } from '@prisma/client';

export class ListImagesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  @Max(100)
  pageSize?: number = 24;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ImageStatus })
  @IsOptional()
  @IsEnum(ImageStatus)
  status?: ImageStatus;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({
    enum: [
      'createdAt',
      'updatedAt',
      'sizeBytes',
      'views',
      'downloads',
      'title',
    ],
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'sizeBytes', 'views', 'downloads', 'title'])
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'sizeBytes'
    | 'views'
    | 'downloads'
    | 'title';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
