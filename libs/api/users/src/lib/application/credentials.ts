import { Injectable } from '@nestjs/common';
import { normalizeEmail, UserRepository } from '../domain';
import { PasswordHasher } from './password-hasher';
import { toView, type UserView } from './user-view';

/** Checks an email and a password. Part of the public API of this domain. */
@Injectable()
export class Credentials {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /** Null for an unknown email and for a wrong password alike. */
  async verify(email: string, password: string): Promise<UserView | null> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      return null;
    }
    return toView(user);
  }

  /** Called after a successful login, so the first one is recorded. */
  async recordLogin(userId: string, now: Date): Promise<void> {
    const user = await this.users.findById(userId);
    if (user && !user.firstLoginAt) {
      user.recordLogin(now);
      await this.users.save(user);
    }
  }
}
