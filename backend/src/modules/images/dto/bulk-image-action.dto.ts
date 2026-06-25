import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export enum BulkImageAction {
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  PERMANENT_DELETE = 'PERMANENT_DELETE',
  SET_VISIBILITY = 'SET_VISIBILITY',
  MOVE_ALBUM = 'MOVE_ALBUM',
  SET_FAVORITE = 'SET_FAVORITE',
  ADD_TAGS = 'ADD_TAGS',
  REMOVE_TAGS = 'REMOVE_TAGS',
  REPROCESS = 'REPROCESS',
}

export class BulkImageActionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({ enum: BulkImageAction })
  @IsEnum(BulkImageAction)
  action: BulkImageAction;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  albumId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
