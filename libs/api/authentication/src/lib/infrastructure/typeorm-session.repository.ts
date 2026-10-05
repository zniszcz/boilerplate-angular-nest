import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { ConcurrentRotationError, Session, SessionRepository } from '../domain';
import { RefreshTokenRecord } from './refresh-token.record';

@Injectable()
export class TypeormSessionRepository extends SessionRepository {
  constructor(
    @InjectRepository(RefreshTokenRecord)
    private readonly records: Repository<RefreshTokenRecord>,
  ) {
    super();
  }

  async findByToken(tokenId: string): Promise<Session | null> {
    const record = await this.records.findOneBy({ id: tokenId });
    if (!record) {
      return null;
    }
    // Ending a session marks every token of the family, so the presented
    // one tells whether the session has ended.
    return Session.restore({
      familyId: record.familyId,
      userId: record.userId,
      token: {
        id: record.id,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        usedAt: record.usedAt,
      },
      revokedAt: record.revokedAt,
    });
  }

  async save(session: Session): Promise<void> {
    const changes = session.pullChanges();
    await this.records.manager.transaction(async (manager) => {
      const records = manager.getRepository(RefreshTokenRecord);
      if (changes.used) {
        // Only one request can mark the token used, even when two run at once.
        const marked = await records.update(
          { id: changes.used.tokenId, usedAt: IsNull() },
          { usedAt: changes.used.at },
        );
        if (!marked.affected) {
          throw new ConcurrentRotationError();
        }
      }
      if (changes.issued) {
        await records.insert({
          ...changes.issued,
          userId: session.userId,
          familyId: session.familyId,
          revokedAt: null,
        });
      }
      if (changes.revokedAt) {
        await records.update(
          { familyId: session.familyId, revokedAt: IsNull() },
          { revokedAt: changes.revokedAt },
        );
      }
    });
  }

  async deleteExpired(userId: string, now: Date): Promise<void> {
    await this.records.delete({ userId, expiresAt: LessThan(now) });
  }

  async deleteStale(now: Date, endedBefore: Date): Promise<number> {
    const result = await this.records
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now })
      .orWhere('revoked_at < :endedBefore', { endedBefore })
      .execute();
    return result.affected ?? 0;
  }
}
