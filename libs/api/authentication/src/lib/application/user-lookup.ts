/** A user as this domain needs it: who it is and what it may do. */
export interface Account {
  id: string;
  email: string;
  permissions: string[];
}

/**
 * Port to the users domain, in the words of this one. Implemented in
 * infrastructure, the only layer that may import another domain.
 */
export abstract class UserLookup {
  /** Null for an unknown email and for a wrong password alike. */
  abstract verifyCredentials(
    email: string,
    password: string,
  ): Promise<Account | null>;
  abstract findById(id: string): Promise<Account | null>;
  /** Tells the users domain that the account has just logged in. */
  abstract recordLogin(id: string, now: Date): Promise<void>;
}
