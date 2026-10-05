import { Permission } from './permission';

/**
 * The User aggregate: an account that can log in and the permissions it
 * holds. Built only through `restore`, from data a repository loaded.
 */
export class User {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    private readonly granted: readonly Permission[],
  ) {}

  static restore(props: {
    id: string;
    email: string;
    passwordHash: string;
    permissions: string[];
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.permissions.map((code) => Permission.of(code)),
    );
  }

  get permissions(): readonly Permission[] {
    return this.granted;
  }

  hasPermission(code: string): boolean {
    return this.granted.some((p) => p.code === code);
  }
}
