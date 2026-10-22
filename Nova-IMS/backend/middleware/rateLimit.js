const HttpError = require('../utils/HttpError');

function rateLimit({ name, windowMs, max, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const account = String(req.body?.usuario || req.body?.userId || '')
      .trim()
      .toLowerCase();
    const key = `${name}|${req.ip}|${account}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new HttpError(429, message || 'Demasiados intentos. Intente más tarde.'));
    }
    next();
  };
}

module.exports = rateLimit;
