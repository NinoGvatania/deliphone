# Deliphone (Делифон)

Сервис аренды смартфонов для курьеров. Моно-репо: FastAPI-бэкенд + три React-фронта + общие TS-типы/токены + локальный стек в docker-compose.

Единственный источник правды по продукту — [`docs/SPEC.md`](docs/SPEC.md).

## Структура

```
deliphone/
├── backend/              FastAPI, SQLAlchemy 2.0 async, Celery, Alembic
├── apps/
│   ├── client/           PWA курьера (Vite + Tailwind + shadcn/ui, порт 5173)
│   ├── partner/          PWA партнёра для планшета (порт 5174)
│   └── admin/            Desktop-админка на Ant Design 5 (порт 5175)
├── packages/
│   ├── ui/               @deliphone/ui — токены, базовые компоненты, Tailwind-пресет
│   └── shared-types/     общие TS-типы домена (re-export токенов из @deliphone/ui)
├── docs/SPEC.md          продуктовая спецификация
├── docker-compose.yml    postgres + postgis, redis, minio, backend, celery
├── Makefile              install / dev / migrate / test / lint
└── .env.example
```

## Требования к окружению

- Docker + Docker Compose (v2)
- Node.js ≥ 20 + pnpm ≥ 9 (`corepack enable` и `corepack prepare pnpm@9.12.3 --activate`)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) — для локального прогона бэкенда без Docker
- Make

## Первый запуск

```bash
cp .env.example .env                    # секреты для локалки
make install                            # uv sync (backend) + pnpm install (node)
make dev-infra                          # поднять postgres/redis/minio/backend
curl http://localhost:8000/healthz      # → {"status":"ok","env":"local",…}
```

Фронты (в отдельных терминалах):

```bash
pnpm --filter @deliphone/client dev     # http://localhost:5173
pnpm --filter @deliphone/partner dev    # http://localhost:5174
pnpm --filter @deliphone/admin dev      # http://localhost:5175
```

Или всё вместе: `make dev` (поднимает инфру и параллельно все три фронта через `pnpm -r --parallel dev`).

## Полезные команды

| Команда | Что делает |
|---|---|
| `make dev` | Docker-инфра + все фронты в dev-режиме |
| `make dev-infra` | Только docker-compose (postgres, redis, minio, backend) |
| `make dev-frontend` | Только `pnpm -r --parallel dev` |
| `make migrate` | `alembic upgrade head` в контейнере бэкенда |
| `make migration name="add_users"` | Создать новую миграцию (autogenerate) |
| `make test` | pytest (backend) + pnpm test (frontend) |
| `make lint` | ruff + mypy + eslint |
| `make format` | ruff format + prettier (где есть) |
| `make down` | Остановить docker-compose |
| `make clean` | `down -v` — снести тома (ВНИМАНИЕ: удалит БД) |

## Сервисы в docker-compose

| Сервис | Порт | Назначение |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 + PostGIS (геоданные точек) |
| `redis` | 6379 | Кэш + брокер Celery |
| `minio` | 9000 / 9001 | S3-совместимое хранилище (API / консоль) |
| `backend` | 8000 | FastAPI (`uvicorn --reload`) |
| `celery-worker`, `celery-beat` | — | Опциональный профиль `workers` (`docker compose --profile workers up -d`) |

MinIO console: http://localhost:9001 (логин/пароль из `.env`, по умолчанию `minioadmin` / `minioadmin`).

## Дизайн-система

Делифон Design System v0.1 — единый источник правды в пакете **`@deliphone/ui`** (`packages/ui`):

```
packages/ui/
├── src/
│   ├── tokens/          colors, typography, spacing, radius, shadow, motion, breakpoints
│   ├── styles/          globals.css (CSS-переменные) + animations.css (keyframes)
│   ├── components/      Button, Card, Badge, Input, Icon, Spinner — порт docs/base.jsx в TS
│   └── utils/           cn() = clsx + tailwind-merge
└── tailwind.preset.ts   Tailwind-пресет (colors, fontSize, shadows, screens, animations)
```

Референс-prototype: `docs/design-system.html` + `docs/{tokens,base,product,compositions,icons,app}.jsx`.

Что в системе:
- Лайм-акцент `#D6FF3D` на графитовой палитре ink-0…ink-900
- Семантика success / warning / danger / info
- Шрифт Onest (Google Fonts) + JetBrains Mono
- Радиусы «пилюли» (xs=6, sm=10, md=14, lg=20, xl=28, 2xl=36, full=999)
- 5 уровней тени, 4 скорости motion (fast/base/slow/spring)

Интеграция:

- **`apps/client`, `apps/partner`** — Tailwind использует пресет `@deliphone/ui/tailwind.preset` и импортирует `@deliphone/ui/styles/{globals,animations}.css` для CSS-переменных и keyframes.
- **`apps/admin`** — `ConfigProvider` Ant Design 5, тема маппит токены в `apps/admin/src/theme/antdTheme.ts` (graphite ink + lime accent, pill-кнопки).
- Базовые UI-компоненты из `@deliphone/ui` (`Button`, `Card`, `Badge`, `Input`, `Icon`, `Spinner`) одинаково работают во всех фронтах.
- Иконки — `Icon` wrapper над `lucide-react`.

Правка токена в одном месте расходится на все три приложения.

## Что дальше

Фаза 0 (инит + дизайн-система) — закрыта. Следующая — **Фаза 1 из §19.1**: модели БД, auth (клиент SMS, партнёр email+пароль, админ+2FA TOTP), базовые CRUD. Дальше по дорожной карте (§19) — KYC, ЮKassa, карта точек, мастера выдачи/приёма, инциденты, уведомления.

## Лицензия

Проприетарный проект.
