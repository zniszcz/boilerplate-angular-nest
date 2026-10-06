/**
 * A permission code such as `users:read`: a resource and an action.
 */
export class Permission {
  private constructor(readonly code: string) {}

  static of(code: string): Permission {
    if (!/^[a-z-]+:[a-z-]+$/.test(code)) {
      throw new Error(`Invalid permission code: ${code}`);
    }
    return new Permission(code);
  }
}
