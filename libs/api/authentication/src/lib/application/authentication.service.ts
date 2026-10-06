import { Injectable } from '@nestjs/common';
import {
  ConcurrentRotationError,
  type RefreshToken,
  Session,
  SessionRepository,
} from '../domain';
import { RefreshTokenCodec } from './refresh-token-codec';
import { type Account, UserLookup } from './user-lookup';

export type SignInResult =
  | { status: 'signed-in'; account: Account; refreshToken: string }
  | { status: 'refused' };

interface ParsedToken {
  id: string;
  secret: string;
}

/** Logging in, refreshing and logging out. */
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly users: UserLookup,
    private readonly sessions: SessionRepository,
    private readonly codec: RefreshTokenCodec,
  ) {}

  async login(email: string, password: string): Promise<SignInResult> {
    const account = await this.users.verifyCredentials(email, password);
    if (!account) {
      return { status: 'refused' };
    }
    const now = new Date();
    await this.users.recordLogin(account.id, now);
    await this.sessions.deleteExpired(account.id, now);
    const { token, presented } = this.codec.issue();
    await this.sessions.save(
      Session.start(this.codec.newFamilyId(), account.id, token),
    );
    return { status: 'signed-in', account, refreshToken: presented };
  }

  /**
   * Exchanges a refresh token for a new one. Permissions are read again, so
   * a change applies from here on.
   */
  async refresh(presented: string): Promise<SignInResult> {
    const parsed = this.codec.parse(presented);
    if (!parsed) {
      return { status: 'refused' };
    }
    const next = this.codec.issue();
    const session = await this.rotate(parsed, next.token);
    const account = session && (await this.users.findById(session.userId));
    if (!account) {
      return { status: 'refused' };
    }
    return { status: 'signed-in', account, refreshToken: next.presented };
  }

  async logout(presented: string): Promise<void> {
    const parsed = this.codec.parse(presented);
    const session = parsed && (await this.find(parsed));
    if (session) {
      session.end(new Date());
      await this.sessions.save(session);
    }
  }

  /** The session after a successful rotation, or null. */
  private async rotate(
    parsed: ParsedToken,
    next: RefreshToken,
  ): Promise<Session | null> {
    // A second attempt sees the use by the request that won the race.
    for (let attempt = 0; attempt < 2; attempt++) {
      const session = await this.find(parsed);
      if (!session) {
        return null;
      }
      const outcome = session.rotate(next, new Date());
      try {
        await this.sessions.save(session);
      } catch (error) {
        if (error instanceof ConcurrentRotationError) {
          continue;
        }
        throw error;
      }
      return outcome === 'rotated' ? session : null;
    }
    return null;
  }

  private async find(parsed: ParsedToken): Promise<Session | null> {
    const session = await this.sessions.findByToken(parsed.id);
    return session && this.codec.matches(parsed.secret, session.tokenHash)
      ? session
      : null;
  }
}
