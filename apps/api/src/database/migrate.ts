// Runs pending migrations and exits. In the cluster it runs in an
// initContainer before the API starts.
import { dataSource } from './data-source';

async function migrate() {
  await dataSource.initialize();
  const command = process.argv[2] ?? 'run';
  if (command === 'revert') {
    await dataSource.undoLastMigration({ transaction: 'each' });
  } else {
    const done = await dataSource.runMigrations({ transaction: 'each' });
    console.log(
      `Migrations run: ${done.map((m) => m.name).join(', ') || 'none'}`,
    );
  }
  await dataSource.destroy();
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
