import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CLI uploader' })
  @IsString()
  @MinLength(1)
  name: string;
}
