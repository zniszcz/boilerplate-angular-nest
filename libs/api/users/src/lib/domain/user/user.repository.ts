import type { User } from './user';

/**
 * Loads and stores User aggregates. An abstract class, not an interface, so
 * NestJS can use it as the injection token; infrastructure provides the
 * implementation.
 */
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  /** Expects the email already normalized. */
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
  /** Returns the saved user, with its id when it is new. */
  abstract save(user: User): Promise<User>;
  abstract delete(id: string): Promise<void>;
  /** How many users hold the permission. */
  abstract countWithPermission(code: string): Promise<number>;
}
