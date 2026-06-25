import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksum?: string;
}
