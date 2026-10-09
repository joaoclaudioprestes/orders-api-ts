# orders-api-ts

> Orders API in TypeScript built test-first: Fastify, Zod, Drizzle and PostgreSQL, with Vitest + Testcontainers integration tests, enforced coverage, Docker and GitHub Actions CI.

---

## Run with Docker

```sh
docker compose up --build
curl localhost:3000/health
```

Docs at `http://localhost:3000/docs`. Env vars (validated at startup): `DATABASE_URL` (required), `PORT` (default 3000). Migrations run on startup.

---

## License

[MIT](LICENSE)
