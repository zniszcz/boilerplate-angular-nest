import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '@boilerplate/api-auth';
import type { UserDto } from './dto/user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** The only query that loads the password hash. */
  findForLogin(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.permissions', 'permission')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({
      where: { id },
      relations: { permissions: true },
    });
  }

  findAll(): Promise<User[]> {
    return this.users.find({
      relations: { permissions: true },
      order: { email: 'ASC' },
    });
  }

  /** Copies only the fields the API may show. */
  toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      permissions: user.permissions.map((p) => p.code),
    };
  }

  toAuthUser(user: User): AuthUser {
    return this.toDto(user);
  }
}
