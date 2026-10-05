import { Injectable } from '@nestjs/common';
import { Credentials, UserQueries } from '@boilerplate/api-users';
import { type Account, UserLookup } from '../application';

/**
 * Adapter to the users domain: the only place this domain imports it, and
 * the one file to change when its public API changes.
 */
@Injectable()
export class UsersUserLookup extends UserLookup {
  constructor(
    private readonly credentials: Credentials,
    private readonly queries: UserQueries,
  ) {
    super();
  }

  verifyCredentials(email: string, password: string): Promise<Account | null> {
    return this.credentials.verify(email, password);
  }

  findById(id: string): Promise<Account | null> {
    return this.queries.findById(id);
  }
}
