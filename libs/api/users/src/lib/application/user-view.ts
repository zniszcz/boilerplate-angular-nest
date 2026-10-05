import type { User } from '../domain';

/** What the outside sees of a user: no password hash. */
export interface UserView {
  id: string;
  email: string;
  permissions: string[];
}

export function toView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    permissions: user.permissions.map((p) => p.code),
  };
}
