import logger from '../config/logger.js';

/**
 * Express 5 centralised error handler.
 * Async route rejections are automatically forwarded here.
 */
export default function errorHandler(err, _req, res, _next) {
  // PostgreSQL-specific error codes
  const pgCodeMap = {
    '23505': { status: 409, message: 'Resource already exists' },
    '23503': { status: 400, message: 'Referenced resource not found' },
    '23514': { status: 409, message: 'Constraint violation' },
  };

  const pgError = pgCodeMap[err.code];
  if (pgError) {
    return res.status(pgError.status).json({
      error: pgError.message,
      detail: err.detail || undefined,
    });
  }

  const status = err.status || err.statusCode || 500;

  // Show the actual error message if:
  //   - It's a client error (4xx)
  //   - It's an upstream/gateway error (502, 503, 504) where we explicitly set err.status
  //   - It's a known error where err.status was explicitly set by our code
  //
  // Hide the message only for truly unexpected 500 errors (unhandled exceptions)
  const isExplicitError = err.status || err.statusCode; // was set intentionally
  const message = (status < 500 || isExplicitError) ? err.message : 'Internal server error';

  if (status >= 500) {
    logger.error({ err, status, stack: err.stack }, message);
  }

  res.status(status).json({ error: message });
}