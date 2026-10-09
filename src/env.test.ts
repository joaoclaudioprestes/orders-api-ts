import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('applies default port and coerces PORT', () => {
    expect(parseEnv({ DATABASE_URL: 'postgres://x' }).PORT).toBe(3000);
    expect(parseEnv({ DATABASE_URL: 'postgres://x', PORT: '8080' }).PORT).toBe(
      8080,
    );
  });

  it('rejects missing DATABASE_URL and invalid PORT', () => {
    expect(() => parseEnv({})).toThrow();
    expect(() => parseEnv({ DATABASE_URL: 'x', PORT: 'abc' })).toThrow();
  });
});
