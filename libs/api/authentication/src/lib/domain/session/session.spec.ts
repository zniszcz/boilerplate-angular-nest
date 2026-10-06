import { describe, expect, it } from 'vitest';
import type { RefreshToken } from './refresh-token';
import { REUSE_GRACE_MS, Session } from './session';

const NOW = new Date('2026-10-06T12:00:00Z');

function at(msFromNow: number): Date {
  return new Date(NOW.getTime() + msFromNow);
}

function token(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'presented',
    tokenHash: 'hash',
    expiresAt: at(60_000),
    usedAt: null,
    ...overrides,
  };
}

const NEXT = token({ id: 'next' });

function session(
  overrides: Partial<RefreshToken> = {},
  revokedAt: Date | null = null,
): Session {
  return Session.restore({
    familyId: 'family',
    userId: 'user',
    token: token(overrides),
    revokedAt,
  });
}

describe('Session', () => {
  it('issues the first token when it starts', () => {
    const started = Session.start('family', 'user', NEXT);

    expect(started.pullChanges()).toEqual({ issued: NEXT });
  });

  describe('rotate', () => {
    it('exchanges an unused token for the next one', () => {
      const current = session();

      expect(current.rotate(NEXT, NOW)).toBe('rotated');
      expect(current.pullChanges()).toEqual({
        used: { tokenId: 'presented', at: NOW },
        issued: NEXT,
      });
    });

    it('exchanges a token only once', () => {
      const current = session();
      current.rotate(NEXT, NOW);

      expect(current.rotate(token({ id: 'third' }), at(1))).toBe('rejected');
    });

    it('keeps the session when a used token comes back within the grace time', () => {
      const current = session({ usedAt: NOW });

      expect(current.rotate(NEXT, at(REUSE_GRACE_MS))).toBe('rejected');
      expect(current.pullChanges()).toEqual({});
    });

    it('ends the session when a used token comes back after the grace time', () => {
      const current = session({ usedAt: NOW });
      const later = at(REUSE_GRACE_MS + 1);

      expect(current.rotate(NEXT, later)).toBe('rejected');
      expect(current.pullChanges()).toEqual({ revokedAt: later });
    });

    it('rejects a token at the moment it expires', () => {
      const current = session({ expiresAt: NOW });

      expect(current.rotate(NEXT, NOW)).toBe('rejected');
      expect(current.pullChanges()).toEqual({});
    });

    it('accepts a token just before it expires', () => {
      expect(session({ expiresAt: at(1) }).rotate(NEXT, NOW)).toBe('rotated');
    });

    it('rejects any token of an ended session', () => {
      const ended = session({}, at(-1));

      expect(ended.rotate(NEXT, NOW)).toBe('rejected');
      expect(ended.pullChanges()).toEqual({});
    });
  });

  describe('end', () => {
    it('ends the session once and keeps the first end time', () => {
      const current = session();
      current.end(NOW);
      current.end(at(1));

      expect(current.pullChanges()).toEqual({ revokedAt: NOW });
      expect(current.rotate(NEXT, at(2))).toBe('rejected');
    });
  });

  it('hands each change to the repository once', () => {
    const current = session();
    current.rotate(NEXT, NOW);
    current.pullChanges();

    expect(current.pullChanges()).toEqual({});
  });
});
