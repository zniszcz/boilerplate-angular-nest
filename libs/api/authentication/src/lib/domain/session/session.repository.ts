import type { Session } from './session';

/**
 * Raised by `save` when another request used the same token first. The
 * caller loads the session again and repeats, so the rules see the use.
 */
export class ConcurrentRotationError extends Error {
  constructor() {
    super('The refresh token was used by another request');
  }
}

export abstract class SessionRepository {
  /** The session the token belongs to, seen through that token. */
  abstract findByToken(tokenId: string): Promise<Session | null>;
  abstract save(session: Session): Promise<void>;
  /** Removes the user's tokens that have expired. */
  abstract deleteExpired(userId: string, now: Date): Promise<void>;
}
