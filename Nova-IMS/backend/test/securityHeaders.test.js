const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { apiSecurityHeaders, pageSecurityHeaders } = require('../middleware/securityHeaders');

function headersFrom(middleware) {
  const headers = {};
  middleware({}, { setHeader: (k, v) => (headers[k] = v) }, () => {});
  return headers;
}

describe('cabeceras de seguridad', () => {
  it('la API usa una política estricta', () => {
    const h = headersFrom(apiSecurityHeaders);
    assert.equal(h['X-Content-Type-Options'], 'nosniff');
    assert.equal(h['X-Frame-Options'], 'DENY');
    assert.match(h['Content-Security-Policy'], /default-src 'none'/);
  });

  it('la página de ubicación permite su script interno y solo conexiones al mismo origen', () => {
    const csp = headersFrom(pageSecurityHeaders)['Content-Security-Policy'];
    assert.match(csp, /script-src 'self' 'unsafe-inline'/);
    assert.match(csp, /connect-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
  });
});
