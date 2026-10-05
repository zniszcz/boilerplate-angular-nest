/**
 * A permission code such as `users:read`: a resource and an action. A value
 * object, so two permissions with the same code are equal.
 */
export class Permission {
  private constructor(readonly code: string) {}

  static of(code: string): Permission {
    if (!/^[a-z-]+:[a-z-]+$/.test(code)) {
      throw new Error(`Invalid permission code: ${code}`);
    }
    return new Permission(code);
  }

  equals(other: Permission): boolean {
    return this.code === other.code;
  }
}
