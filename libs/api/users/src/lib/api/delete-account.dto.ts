import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  /** The current password, so an open session alone cannot delete the account. */
  @IsString()
  @IsNotEmpty()
  password!: string;
}
