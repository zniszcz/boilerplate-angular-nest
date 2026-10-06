import { Injectable } from '@nestjs/common';
import { normalizeEmail, User, UserRepository } from '../domain';
import { PasswordGenerator } from './password-generator';
import { PasswordHasher } from './password-hasher';
import { toView, type UserView } from './user-view';

export type RegistrationResult =
  | { status: 'registered'; user: UserView; password: string }
  | { status: 'email-taken' };

/** Adds an account with a generated password, shown to the caller once. */
@Injectable()
export class UserRegistration {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly generator: PasswordGenerator,
  ) {}

  async register(email: string): Promise<RegistrationResult> {
    if (await this.users.findByEmail(normalizeEmail(email))) {
      return { status: 'email-taken' };
    }
    const password = this.generator.generate();
    const user = await this.users.save(
      User.register(email, await this.hasher.hash(password)),
    );
    return { status: 'registered', user: toView(user), password };
  }
}
