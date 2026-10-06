import { describe, expect, it } from 'vitest';
import { Permission } from './permission';

describe('Permission', () => {
  it.each(['users:read', 'audit-log:export'])('accepts %s', (code) => {
    expect(Permission.of(code).code).toBe(code);
  });

  it.each([
    ['without an action', 'users'],
    ['with an empty action', 'users:'],
    ['with capital letters', 'Users:read'],
    ['with a third part', 'users:read:all'],
    ['with text around it', ' users:read'],
  ])('rejects a code %s', (_, code) => {
    expect(() => Permission.of(code)).toThrow(
      `Invalid permission code: ${code}`,
    );
  });
});
