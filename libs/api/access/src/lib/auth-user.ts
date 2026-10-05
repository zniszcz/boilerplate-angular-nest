/** The logged in user, as carried in the access token. */
export interface AuthUser {
  id: string;
  email: string;
  permissions: string[];
}

/** Claims stored in the JWT. `sub` is the user id. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  permissions: string[];
}
