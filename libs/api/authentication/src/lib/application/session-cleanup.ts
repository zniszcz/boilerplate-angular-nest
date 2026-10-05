import { Injectable } from '@nestjs/common';
import { ENDED_SESSION_RETENTION_MS, SessionRepository } from '../domain';

/**
 * Removes refresh tokens nobody can use any more. Run on a schedule by the
 * `cleanup` command. Tokens of deleted users need no step of their own:
 * they expire like any other.
 */
@Injectable()
export class SessionCleanup {
  constructor(private readonly sessions: SessionRepository) {}

  /** Returns how many tokens were removed. */
  run(now: Date): Promise<number> {
    return this.sessions.deleteStale(
      now,
      new Date(now.getTime() - ENDED_SESSION_RETENTION_MS),
    );
  }
}
