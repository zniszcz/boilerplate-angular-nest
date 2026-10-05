import { Injectable } from '@nestjs/common';
import { UserRepository } from '../domain';
import { toView, type UserView } from './user-view';

/** Reading users. Part of the public API of this domain. */
@Injectable()
export class UserQueries {
  constructor(private readonly users: UserRepository) {}

  async findById(id: string): Promise<UserView | null> {
    const user = await this.users.findById(id);
    return user && toView(user);
  }

  async list(): Promise<UserView[]> {
    return (await this.users.findAll()).map(toView);
  }
}
