import type { User } from '../domain';

/** What the outside sees of a user: no password hash. */
export interface UserView {
  id: string;
  email: string;
  permissions: string[];
  /** Null until the user logs in for the first time. */
  firstLoginAt: Date | null;
}

/** For a saved user, which always has an id. */
export function toView(user: User): UserView {
  if (!user.id) {
    throw new Error('A user without an id has not been saved');
  }
  return {
    id: user.id,
    email: user.email,
    permissions: user.permissions.map((p) => p.code),
    firstLoginAt: user.firstLoginAt,
  };
}
