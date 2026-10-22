const logger = require('../utils/logger');
const HttpError = require('../utils/HttpError');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error('[ERROR]', err);
  }
  const exposeMessage = status < 500 || err instanceof HttpError;
  res.status(status).json({
    error: {
      message: (exposeMessage && err.message) || 'Error interno',
      details: err.details || undefined,
    },
  });
}

module.exports = errorHandler;
