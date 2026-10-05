/** One refresh token of a session. The secret itself is never stored. */
export interface RefreshToken {
  id: string;
  /** SHA-256 of the secret part. */
  tokenHash: string;
  expiresAt: Date;
  /** Set when the token was exchanged for a new one. */
  usedAt: Date | null;
}
