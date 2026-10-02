import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { REFRESH_TOKEN_TTL_SECONDS } from '@boilerplate/api-auth';
import { RefreshToken } from './refresh-token.entity';

/**
 * A reused token within this time is a race between two tabs refreshing at
 * once, not a theft, so the session is not revoked.
 */
const REUSE_GRACE_MS = 30_000;

export type RotateResult =
  { status: 'rotated'; userId: string; token: string } | { status: 'rejected' };

/**
 * Refresh tokens: `<id>.<secret>`. Each one can be exchanged once, for a new
 * one in the same family (rotation). Using an exchanged token again means it
 * was stolen, so the whole family is revoked.
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokens: Repository<RefreshToken>,
  ) {}

  /** Starts a new session at login. */
  async start(userId: string): Promise<string> {
    await this.tokens.delete({ userId, expiresAt: LessThan(new Date()) });
    return this.issue(userId, randomUUID());
  }

  async rotate(presented: string): Promise<RotateResult> {
    const stored = await this.find(presented);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return { status: 'rejected' };
    }
    // Only one request can mark the token used, even when two run at once.
    const marked = await this.tokens.update(
      { id: stored.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (!marked.affected) {
      const usedAt = (await this.tokens.findOneBy({ id: stored.id }))?.usedAt;
      if (!usedAt || Date.now() - usedAt.getTime() > REUSE_GRACE_MS) {
        await this.revokeFamily(stored.familyId);
      }
      return { status: 'rejected' };
    }
    return {
      status: 'rotated',
      userId: stored.userId,
      token: await this.issue(stored.userId, stored.familyId),
    };
  }

  /** Ends the session the token belongs to. */
  async end(presented: string): Promise<void> {
    const stored = await this.find(presented);
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  /** Ends every session of the user, for example after a password change. */
  async endAll(userId: string): Promise<void> {
    await this.tokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issue(userId: string, familyId: string): Promise<string> {
    const secret = randomBytes(32).toString('base64url');
    const saved = await this.tokens.save(
      this.tokens.create({
        userId,
        familyId,
        tokenHash: sha256(secret),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
        usedAt: null,
        revokedAt: null,
      }),
    );
    return `${saved.id}.${secret}`;
  }

  private async find(presented: string): Promise<RefreshToken | null> {
    const [id, secret] = presented.split('.');
    if (!id || !secret || !isUuid(id)) {
      return null;
    }
    const stored = await this.tokens.findOneBy({ id });
    if (
      !stored ||
      !timingSafeEqual(
        Buffer.from(stored.tokenHash),
        Buffer.from(sha256(secret)),
      )
    ) {
      return null;
    }
    return stored;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.tokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
