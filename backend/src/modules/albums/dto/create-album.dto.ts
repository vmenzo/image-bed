import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Visibility } from '@prisma/client';

export class CreateAlbumDto {
  @ApiProperty({ example: 'Product screenshots' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Screenshots for docs and changelog.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;
}
