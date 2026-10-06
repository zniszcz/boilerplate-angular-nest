import { UserDto } from './user.dto';

/** A new account and its starting password, which the API shows only here. */
export class CreatedUserDto {
  user!: UserDto;
  password!: string;
}
