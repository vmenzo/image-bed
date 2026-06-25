import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProvider, Visibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class ImportUrlDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ enum: StorageProvider })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;
}
