import { IsEmail } from 'class-validator';

export class CreateUserDto {
  /** Stored in lower case, whatever the case typed. */
  @IsEmail()
  email!: string;
}
