import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import catalogRoutes from './routes/catalog.js';
import errorHandler from './middleware/errorHandler.js';
import { connectRabbitMQ } from './events/publisher.js';
import pool from './config/database.js';
import logger from './config/logger.js';

const app = express();
const PORT = process.env.PORT || 4001;

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ── Health checks ──────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbCheck = await pool.query('SELECT 1').then(() => 'ok').catch(() => 'fail');
  const status = dbCheck === 'ok' ? 200 : 503;
  res.status(status).json({
    service: 'catalog',
    status: dbCheck === 'ok' ? 'healthy' : 'degraded',
    db: dbCheck,
    uptime: Math.round(process.uptime()),
  });
});

// ── Routes ─────────────────────────────────────────
app.use('/api/catalog', catalogRoutes);

// ── Error handler (Express 5: async rejections auto-forwarded) ──
app.use(errorHandler);

// ── Startup ────────────────────────────────────────
async function start() {
  await connectRabbitMQ();
  app.listen(PORT, () => logger.info(`Catalog service listening on :${PORT}`));
}

// ── Graceful shutdown ──────────────────────────────
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully…`);
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
