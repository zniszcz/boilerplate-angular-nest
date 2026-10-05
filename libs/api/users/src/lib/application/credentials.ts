import { Injectable } from '@nestjs/common';
import { UserRepository } from '../domain';
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
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      return null;
    }
    return toView(user);
  }
}
