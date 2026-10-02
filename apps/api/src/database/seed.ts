// Creates the test account from SEED_USER_EMAIL and SEED_USER_PASSWORD.
// Runs locally and on the test environment, never on production.
import { seedUsers } from '@boilerplate/api-users';
import { dataSource } from './data-source';

async function seed() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_USER_EMAIL and SEED_USER_PASSWORD must be set');
  }
  await dataSource.initialize();
  await seedUsers(dataSource, { email, password });
  await dataSource.destroy();
  console.log(`Seeded user ${email}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
