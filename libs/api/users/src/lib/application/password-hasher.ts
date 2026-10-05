/** Port: checks a password against its stored hash. */
export abstract class PasswordHasher {
  abstract verify(password: string, hash: string): Promise<boolean>;
}
