import { normalizeEmail } from './email';
import { Permission } from './permission';

/**
 * The User aggregate: an account that can log in and the permissions it
 * holds. Built by `register` for a new account, or by `restore` from data a
 * repository loaded.
 */
export class User {
  private constructor(
    readonly id: string | null,
    readonly email: string,
    readonly passwordHash: string,
    private readonly granted: readonly Permission[],
    private firstLogin: Date | null,
  ) {}

  /** A new account: no permissions and no login yet. The id comes on save. */
  static register(email: string, passwordHash: string): User {
    return new User(null, normalizeEmail(email), passwordHash, [], null);
  }

  static restore(props: {
    id: string;
    email: string;
    passwordHash: string;
    permissions: string[];
    firstLoginAt: Date | null;
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.permissions.map((code) => Permission.of(code)),
      props.firstLoginAt,
    );
  }

  get permissions(): readonly Permission[] {
    return this.granted;
  }

  /** When the user logged in for the first time; null until then. */
  get firstLoginAt(): Date | null {
    return this.firstLogin;
  }

  hasPermission(code: string): boolean {
    return this.granted.some((p) => p.code === code);
  }

  /** Only the first login is kept: it tells that the account is in use. */
  recordLogin(now: Date): void {
    this.firstLogin ??= now;
  }
}
