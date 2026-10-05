import type { RefreshToken } from './refresh-token';

/**
 * A reused token within this time is a race between two tabs refreshing at
 * once, not a theft, so the session is not revoked.
 */
export const REUSE_GRACE_MS = 30_000;

/**
 * Ended sessions are kept this long after they end, so a suspected theft can
 * still be looked into. Expired tokens go at once.
 */
export const ENDED_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type RotateOutcome = 'rotated' | 'rejected';

/** Changes the repository must write, in this order. */
export interface SessionChanges {
  used?: { tokenId: string; at: Date };
  issued?: RefreshToken;
  revokedAt?: Date;
}

/**
 * The Session aggregate: one login, seen through the refresh token presented
 * now. Tokens issued one after another by rotation share the session
 * (`familyId`). Rules:
 * - each token can be exchanged once, for a new one in the same session,
 * - exchanging a used token again means it was stolen: the session ends,
 *   unless it happens within REUSE_GRACE_MS,
 * - an ended or expired session exchanges nothing.
 */
export class Session {
  private changes: SessionChanges = {};

  private constructor(
    readonly familyId: string,
    readonly userId: string,
    private readonly token: RefreshToken,
    private revokedAt: Date | null,
  ) {}

  /** A new session at login, with its first token. */
  static start(familyId: string, userId: string, first: RefreshToken): Session {
    const session = new Session(familyId, userId, first, null);
    session.changes.issued = first;
    return session;
  }

  static restore(props: {
    familyId: string;
    userId: string;
    token: RefreshToken;
    revokedAt: Date | null;
  }): Session {
    return new Session(
      props.familyId,
      props.userId,
      { ...props.token },
      props.revokedAt,
    );
  }

  /** The hash of the presented token, to check its secret. */
  get tokenHash(): string {
    return this.token.tokenHash;
  }

  /** Exchanges the presented token for `next`. */
  rotate(next: RefreshToken, now: Date): RotateOutcome {
    if (this.revokedAt || this.token.expiresAt <= now) {
      return 'rejected';
    }
    if (this.token.usedAt) {
      if (now.getTime() - this.token.usedAt.getTime() > REUSE_GRACE_MS) {
        this.end(now);
      }
      return 'rejected';
    }
    this.token.usedAt = now;
    this.changes.used = { tokenId: this.token.id, at: now };
    this.changes.issued = next;
    return 'rotated';
  }

  /** Ends the session: logout, or a stolen token. */
  end(now: Date): void {
    if (!this.revokedAt) {
      this.revokedAt = now;
      this.changes.revokedAt = now;
    }
  }

  /** For the repository. Clears the list, so a save writes them once. */
  pullChanges(): SessionChanges {
    const changes = this.changes;
    this.changes = {};
    return changes;
  }
}
