import pg from 'pg';

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
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'smhussain',
      database: process.env.DB_NAME || 'procurement_db',
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };

const pool = new pg.Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
  process.exit(1);
});

export default pool;
