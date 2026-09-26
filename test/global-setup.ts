import { config } from 'dotenv';

config({ path: '.env.test', override: true });

if (process.env.DB_NAME !== 'week10_test') {
  throw new Error(
    `Refusing to run E2E tests against database "${process.env.DB_NAME}". Expected "week10_test".`,
  );
}

export default async function globalSetup(): Promise<void> {
  const { default: dataSource } = await import(
    '../src/database/data-source'
  );

  await dataSource.initialize();

  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
