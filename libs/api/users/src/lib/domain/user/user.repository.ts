import type { User } from './user';

/**
 * Loads User aggregates. An abstract class, not an interface, so NestJS can
 * use it as the injection token; infrastructure provides the implementation.
 */
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
}
