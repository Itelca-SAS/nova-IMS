const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

function setCommonHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
}

function apiSecurityHeaders(req, res, next) {
  setCommonHeaders(res);
  res.setHeader('Content-Security-Policy', API_CSP);
  next();
}

function pageSecurityHeaders(req, res, next) {
  setCommonHeaders(res);
  res.setHeader('Content-Security-Policy', PAGE_CSP);
  next();
}

module.exports = { apiSecurityHeaders, pageSecurityHeaders };
