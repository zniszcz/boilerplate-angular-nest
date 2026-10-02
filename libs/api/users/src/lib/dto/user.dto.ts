/** A user as the API returns it. Has no password fields on purpose. */
export class UserDto {
  id!: string;
  email!: string;
  /** Permission codes, for example `users:read`. */
  permissions!: string[];
}
