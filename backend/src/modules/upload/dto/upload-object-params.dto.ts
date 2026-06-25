import { IsString, Matches, MinLength } from 'class-validator';

export class UploadObjectParamsDto {
  @IsString()
  @MinLength(1)
  @Matches(/^users\/[a-zA-Z0-9_-]+\/\d{4}-\d{2}-\d{2}\/[a-z0-9]+\.[a-z0-9]+$/)
  key: string;
}
