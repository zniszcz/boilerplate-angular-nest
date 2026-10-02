export class TokenDto {
  /** Send it as `Authorization: Bearer <token>`. */
  accessToken!: string;
  /** Seconds until the token expires. */
  expiresIn!: number;
}
