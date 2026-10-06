/** Port: a random starting password for a new account. */
export abstract class PasswordGenerator {
  abstract generate(): string;
}
