# orders-api-ts

API de pedidos em TypeScript construída com testes desde o primeiro commit:
o mesmo rigor dos projetos Python, agora em Node.

**Lacuna que fecha:** 3 (testes em TypeScript).
**Conceitos-alvo:** TDD em TS, testes de integração contra banco real.

## Escopo (fechado)

Dentro:
- CRUD de produtos e pedidos, com máquina de estados do pedido (`created → paid → shipped → cancelled`)
- Validação com Zod e OpenAPI gerado automaticamente (Swagger)
- Camadas: rotas → service → repositório (interface + implementação Postgres)
- Testes unitários (service) e de integração (rotas + Postgres via Testcontainers) com Vitest
- Cobertura mínima de 80% obrigatória no CI
- Docker + GitHub Actions (lint, typecheck, test)

Fora:
- Auth, pagamento real, frontend

## Stack

Node 22, TypeScript, Fastify, Zod, Drizzle ORM, Postgres 16, Vitest, Testcontainers, Docker.

## Fases

1. Setup: TS estrito, ESLint, Vitest, CI
2. Produtos (teste primeiro)
3. Pedidos + máquina de estados
4. Testes de integração com Testcontainers
5. Docker + README final

## Pronto quando

- Transição de estado inválida retorna 409 e tem teste
- Cobertura ≥ 80% bloqueando merge no CI
- `docker compose up` sobe API + banco
