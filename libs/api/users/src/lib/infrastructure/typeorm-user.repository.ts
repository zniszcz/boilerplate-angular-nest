import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRepository } from '../domain';
import { UserRecord } from './user.record';

@Injectable()
export class TypeormUserRepository extends UserRepository {
  constructor(
    @InjectRepository(UserRecord)
    private readonly records: Repository<UserRecord>,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    return this.findOneWhere('user.id = :id', { id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneWhere('user.email = :email', { email });
  }

  async findAll(): Promise<User[]> {
    const records = await this.query().orderBy('user.email').getMany();
    return records.map(toDomain);
  }

  private async findOneWhere(
    where: string,
    params: Record<string, unknown>,
  ): Promise<User | null> {
    const record = await this.query().where(where, params).getOne();
    return record && toDomain(record);
  }

  // The password hash column has select: false, so it is added on purpose.
  // It stays inside the backend: no view or DTO has a field for it.
  private query() {
    return this.records
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.permissions', 'permission');
  }
}

function toDomain(record: UserRecord): User {
  return User.restore({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    permissions: record.permissions.map((p) => p.code),
  });
}
