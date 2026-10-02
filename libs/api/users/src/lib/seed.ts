import type { DataSource } from 'typeorm';
import { hashPassword } from '@boilerplate/api-auth';
import { Permission } from './permission.entity';
import { PERMISSION_DESCRIPTIONS } from './permissions';
import { User } from './user.entity';

/**
 * Writes all permissions and one user who has all of them. Safe to run many
 * times: it updates what exists and keeps the password in sync.
 */
export async function seedUsers(
  dataSource: DataSource,
  account: { email: string; password: string },
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const permissions = Object.entries(PERMISSION_DESCRIPTIONS).map(
      ([code, description]) =>
        manager.create(Permission, { code, description }),
    );
    await manager.save(permissions);

    const existing = await manager.findOne(User, {
      where: { email: account.email },
    });
    await manager.save(
      manager.create(User, {
        id: existing?.id,
        email: account.email,
        passwordHash: await hashPassword(account.password),
        permissions,
      }),
    );
  });
}
