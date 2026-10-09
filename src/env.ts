import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
});

export const parseEnv = (env: NodeJS.ProcessEnv) => schema.parse(env);
