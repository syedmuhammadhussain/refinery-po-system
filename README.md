# Refinery Purchase Order System

A production-grade microservices application for managing purchase orders in a refinery equipment procurement workflow.

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  API Gateway  │────▶│ Catalog Service  │
│ (Next.js 16) │     │ (Express 5)   │     │  (Express 5)     │
│  Port 3000   │     │  Port 4000    │     │  Port 4001       │
└─────────────┘     └───────┬───────┘     └────────┬─────────┘
                            │                       │
                            │              ┌────────▼─────────┐
                            └─────────────▶│Procurement Service│
                                           │  (Express 5)      │
                                           │  Port 4002        │
                                           └────────┬─────────┘
                                                    │
                    ┌───────────────┐       ┌───────▼───────┐
                    │  RabbitMQ 4.1 │◀──────│ PostgreSQL 17 │
                    │  Port 15672   │       │  Port 5433*   │
                    └───────────────┘       └───────────────┘

* Port 5433 externally to avoid conflict with your local PostgreSQL on 5432
  (inside Docker, services connect on the default 5432)
```

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | Next.js 16.1, React 19.2, Tailwind CSS 4.1, Zustand 5  |
| Data       | TanStack React Query 5, Axios                          |
| Backend    | Node.js 22 LTS, Express 5.2, ESM modules               |
| Database   | PostgreSQL 17 (separate DBs per service)                |
| Messaging  | RabbitMQ 4.1 (topic exchange, event-driven)             |
| Logging    | Pino (structured JSON logging)                          |
| Container  | Docker Compose, multi-stage builds                      |

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 3000, 4000–4002, 5433, 5672, 15672 available

### Step 1: Create your `.env` file

```bash
cd refinery-po-system
cp .env.example .env
# Edit .env if you need different credentials
```

The `.env` file contains:
```dotenv
PG_USER=postgres
PG_PASSWORD=smhussain
PG_EXTERNAL_PORT=5433

RABBITMQ_USER=rabbit_user
RABBITMQ_PASS=secret
```

### Step 2: Start everything

```bash
# IMPORTANT: If you ran this before with old config, wipe the volume first!
docker-compose down -v

# Start all services
docker-compose up --build -d

# Watch the logs to confirm everything is healthy
docker-compose logs -f
```

### Step 3: Verify in pgAdmin

Connect to Docker's PostgreSQL:
- **Host**: `localhost`
- **Port**: `5433` (NOT 5432 — that's your local PG)
- **Username**: `postgres`
- **Password**: `smhussain`

You should see three databases: `postgres`, `catalog_db`, `procurement_db`.

### Access Points

| Service             | URL                          |
|---------------------|------------------------------|
| Frontend            | http://localhost:3000         |
| API Gateway         | http://localhost:4000         |
| Catalog Service     | http://localhost:4001         |
| Procurement Service | http://localhost:4002         |
| RabbitMQ Management | http://localhost:15672        |
| PostgreSQL (Docker) | localhost:5433               |

RabbitMQ login: `rabbit_user` / `secret`

## Database Configuration Explained

Each backend service supports **two ways** to configure the database connection:

### Option A: Individual Parameters (familiar style)
```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=smhussain
DB_NAME=catalog_db
```

This is what you're used to:
```javascript
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'smhussain',
  database: process.env.DB_NAME || 'catalog_db',
});
```

### Option B: Connection String (production standard)
```dotenv
DATABASE_URL=postgres://postgres:smhussain@localhost:5433/catalog_db
```

This is the same information in URI format. Production platforms (Heroku, Railway,
Supabase, AWS RDS) always provide a single `DATABASE_URL` string. If `DATABASE_URL`
is set, it takes priority over individual params.

### Why `postgres` instead of `localhost` inside Docker?

Inside Docker's network, containers communicate by **service name**:
```
catalog-service ──→ postgres:5432    (Docker DNS resolves "postgres" to the container)
your-machine    ──→ localhost:5433   (mapped port on your host machine)
```

The `docker-compose.yml` passes `DB_HOST=postgres` to services so they find
the database container. When running locally (without Docker), you'd use
`DB_HOST=localhost` and `DB_PORT=5433` instead.

## Key Features

- **Catalog Search** — Full-text search with pg_trgm, debounced input (400ms), URL-synced filters, multi-column sort, pagination
- **Single-Supplier Enforcement** — DB trigger + API validation + frontend pre-check; returns `409 Conflict` on mismatch
- **PO Lifecycle** — `DRAFT → SUBMITTED → APPROVED/REJECTED → FULFILLED` with validated state machine
- **PO Number Generation** — Auto-generated `PO-YYYY-NNNNN` format via PostgreSQL sequence
- **Status Timeline** — Full audit trail with timestamps, user, and notes per transition
- **Idempotency** — `idempotency_key` on PO creation prevents duplicate drafts
- **Express 5 Async** — Rejected promises auto-forwarded to error middleware (no try/catch in routes)
- **Native fetch** — Inter-service calls use Node 22's built-in `fetch`
- **Structured Logging** — Pino with pretty-printing in dev, JSON in production
- **Graceful Shutdown** — SIGTERM/SIGINT handling with connection pool cleanup

## Troubleshooting

### "Databases not showing in pgAdmin"
Docker init scripts only run on the FIRST start (when the volume is empty).
If you started with wrong config, run:
```bash
docker-compose down -v    # -v removes the volume
docker-compose up --build -d
```

### "Connection refused on port 5432"
Docker PostgreSQL is mapped to port **5433** to avoid conflict with your local
PostgreSQL. Use `localhost:5433` in pgAdmin.

### "Service keeps restarting"
Check logs: `docker-compose logs catalog-service`
Usually means the database isn't ready yet. The `restart: on-failure` policy
will keep retrying until postgres is healthy.

## Project Structure

```
refinery-po-system/
├── .env.example                       # Root env vars for docker-compose
├── .env                               # Your local copy (gitignored)
├── docker-compose.yml
├── database/
│   ├── init.sql                       # Creates catalog_db + procurement_db
│   ├── catalog/seed.sql               # Tables + 50-item seed data
│   └── procurement/schema.sql         # Tables + triggers + functions
├── services/
│   ├── catalog-service/
│   │   ├── .env.example               # For running outside Docker
│   │   ├── package.json               # Express 5.2.1, ESM
│   │   └── src/
│   │       ├── index.js
│   │       ├── config/{database,logger}.js
│   │       ├── models/CatalogItem.js
│   │       ├── routes/catalog.js
│   │       ├── events/publisher.js
│   │       └── middleware/errorHandler.js
│   ├── procurement-service/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── config/{database,logger}.js
│   │       ├── models/PurchaseOrder.js
│   │       ├── routes/procurement.js
│   │       ├── events/{publisher,consumer}.js
│   │       └── middleware/errorHandler.js
│   └── gateway/
│       ├── .env.example
│       ├── package.json
│       └── src/{index,config/logger}.js
└── frontend/
    ├── .env.example
    ├── package.json                   # Next.js 16.1, React 19.2
    ├── postcss.config.mjs             # Tailwind v4 (@tailwindcss/postcss)
    └── src/
        ├── app/
        │   ├── globals.css            # @theme CSS-first config (Tailwind v4)
        │   ├── providers.jsx          # Isolated client boundary
        │   ├── layout.jsx
        │   ├── page.jsx               # Dashboard
        │   ├── catalog/page.jsx
        │   └── purchase-orders/
        │       ├── page.jsx
        │       ├── [id]/page.jsx
        │       └── new/page.jsx
        ├── components/layout/Sidebar.jsx
        ├── store/draftStore.js        # Zustand 5
        ├── lib/api.js
        ├── hooks/useDebounce.js
        └── types/index.ts
```
