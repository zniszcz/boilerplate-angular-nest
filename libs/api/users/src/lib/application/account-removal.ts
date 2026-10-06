import { Injectable } from '@nestjs/common';
import { PERMISSIONS, UserRepository } from '../domain';
import { PasswordHasher } from './password-hasher';

export type RemovalResult = 'removed' | 'wrong-password' | 'last-admin';

/**
 * A user deletes their own account. Sessions need no step of their own: a
 * refresh for a missing user is refused, and the tokens expire.
 */
@Injectable()
export class AccountRemoval {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async removeOwn(userId: string, password: string): Promise<RemovalResult> {
    const user = await this.users.findById(userId);
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      return 'wrong-password';
    }
    // Someone must stay able to add users.
    if (
      user.hasPermission(PERMISSIONS.usersCreate) &&
      (await this.users.countWithPermission(PERMISSIONS.usersCreate)) <= 1
    ) {
      return 'last-admin';
    }
    await this.users.delete(userId);
    return 'removed';
  }
}
