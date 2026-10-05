import type { DataSource } from 'typeorm';
import { hashPassword } from '@boilerplate/api-access';
import { PERMISSION_DESCRIPTIONS } from '../domain';
import { PermissionRecord } from './permission.record';
import { UserRecord } from './user.record';

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
        manager.create(PermissionRecord, { code, description }),
    );
    await manager.save(permissions);

    const existing = await manager.findOne(UserRecord, {
      where: { email: account.email },
    });
    await manager.save(
      manager.create(UserRecord, {
        id: existing?.id,
        email: account.email,
        passwordHash: await hashPassword(account.password),
        permissions,
      }),
    );
  });
}
