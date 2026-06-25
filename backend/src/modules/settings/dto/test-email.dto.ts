import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class TestEmailDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;
}
