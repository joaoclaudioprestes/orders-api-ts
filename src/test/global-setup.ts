import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// One real Postgres for the whole suite; migrations run before any test.
export default async function setup() {
  const container = await new PostgreSqlContainer(
    'public.ecr.aws/docker/library/postgres:17-alpine',
  ).start();
  const db = drizzle(container.getConnectionUri());
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.$client.end();
  process.env.TEST_DATABASE_URL = container.getConnectionUri();
  return () => container.stop();
}
