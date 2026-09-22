import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: '.env.test', override: true });

const TEST_DATABASE_NAME = 'week10_test';

const TABLES_TO_RESET = [
  'task_tags',
  'comments',
  'tasks',
  'project_members',
  'refresh_tokens',
  'tags',
  'projects',
  'users',
];

export async function resetTestDatabase(
  dataSource: DataSource,
): Promise<void> {
  const databaseName = dataSource.options.database;

  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to reset database "${databaseName}". Expected "${TEST_DATABASE_NAME}".`,
    );
  }

  await dataSource.query(
    `TRUNCATE TABLE ${TABLES_TO_RESET.map(table => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
