import type { RefreshToken } from '../domain';

/**
 * Port for the cryptography of refresh tokens. The client gets
 * `<id>.<secret>`, the database keeps only a hash of the secret.
 */
export abstract class RefreshTokenCodec {
  abstract newFamilyId(): string;
  /** A new token, and the string to give the client. */
  abstract issue(): { token: RefreshToken; presented: string };
  /** Null when the string does not have the right shape. */
  abstract parse(presented: string): { id: string; secret: string } | null;
  abstract matches(secret: string, tokenHash: string): boolean;
}
