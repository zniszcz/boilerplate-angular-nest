import { describe, expect, it } from 'vitest';
import { User } from './user';

const NOW = new Date('2026-10-06T12:00:00Z');

function restored(firstLoginAt: Date | null = null): User {
  return User.restore({
    id: 'id',
    email: 'user@example.com',
    passwordHash: 'hash',
    permissions: ['users:create'],
    firstLoginAt,
  });
}

describe('User', () => {
  it('registers with an email in lower case, no permissions and no login yet', () => {
    const user = User.register('  Ala.Kot@Example.COM ', 'hash');

    expect(user.email).toBe('ala.kot@example.com');
    expect(user.permissions).toEqual([]);
    expect(user.firstLoginAt).toBeNull();
  });

  it('records the first login', () => {
    const user = restored();

    user.recordLogin(NOW);

    expect(user.firstLoginAt).toEqual(NOW);
  });

  it('keeps the first login when the user logs in again', () => {
    const user = restored(NOW);

    user.recordLogin(new Date(NOW.getTime() + 1000));

    expect(user.firstLoginAt).toEqual(NOW);
  });

  it('tells which permissions it holds', () => {
    expect(restored().hasPermission('users:create')).toBe(true);
    expect(restored().hasPermission('users:read')).toBe(false);
  });
});
