import pg from "pg";

/**
 * PostgreSQL connection pool.
 *
 * Supports TWO configuration styles:
 *
 * 1) CONNECTION STRING (DATABASE_URL):
 *    DATABASE_URL=postgres://postgres:smhussain@postgres:5432/procurement_db
 *
 * 2) INDIVIDUAL PARAMS:
 *    DB_HOST=postgres
 *    DB_PORT=5432
 *    DB_USER=postgres
 *    DB_PASSWORD=smhussain
 *    DB_NAME=procurement_db
 *
 * If DATABASE_URL is set, it takes priority. Otherwise, individual params are used.
 */

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new pg.Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
  process.exit(1);
});

export default pool;
