/** The logged in user, as login and refresh return it. No password fields. */
export class AccountDto {
  id!: string;
  email!: string;
  /** Permission codes, for example `users:read`. */
  permissions!: string[];
}
