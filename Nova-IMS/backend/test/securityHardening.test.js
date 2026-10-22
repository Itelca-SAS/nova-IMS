const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../config/validateEnv');
const rateLimit = require('../middleware/rateLimit');
const otp = require('../services/otp.service');

describe('validateEnv', () => {
  it('exige JWT_SECRET', () => {
    assert.ok(validateEnv({}).some((e) => e.includes('JWT_SECRET')));
  });

  it('acepta configuración mínima en desarrollo', () => {
    assert.deepEqual(validateEnv({ JWT_SECRET: 'dev' }), []);
  });

  it('rechaza secreto de ejemplo, secreto corto y CORS abierto en producción', () => {
    const base = { NODE_ENV: 'production', CORS_ORIGIN: 'https://ims.example.com' };
    assert.equal(
      validateEnv({ ...base, JWT_SECRET: 'cambia-esta-clave-en-produccion-es-muy-importante' })
        .length,
      1,
    );
    assert.equal(validateEnv({ ...base, JWT_SECRET: 'corto' }).length, 1);
    assert.equal(validateEnv({ ...base, JWT_SECRET: 'x'.repeat(32), CORS_ORIGIN: '*' }).length, 1);
    assert.deepEqual(validateEnv({ ...base, JWT_SECRET: 'x'.repeat(32) }), []);
  });
});

describe('rateLimit', () => {
  function run(limiter, body, ip = '1.1.1.1') {
    let error = null;
    const res = { set() {} };
    limiter({ ip, body }, res, (err) => {
      error = err || null;
    });
    return error;
  }

  it('bloquea con 429 al superar el máximo por cuenta e IP', () => {
    const limiter = rateLimit({ name: 't1', windowMs: 60_000, max: 2 });
    assert.equal(run(limiter, { usuario: 'ana' }), null);
    assert.equal(run(limiter, { usuario: 'ana' }), null);
    assert.equal(run(limiter, { usuario: 'ana' })?.status, 429);
  });

  it('no bloquea a otra cuenta desde la misma IP', () => {
    const limiter = rateLimit({ name: 't2', windowMs: 60_000, max: 1 });
    assert.equal(run(limiter, { usuario: 'ana' }), null);
    assert.equal(run(limiter, { usuario: 'luis' }), null);
  });
});

describe('otp.service', () => {
  it('genera códigos de 6 dígitos y los verifica una sola vez', () => {
    const code = otp.generate('U-TEST');
    assert.match(code, /^\d{6}$/);
    assert.deepEqual(otp.verify('U-TEST', code), { ok: true });
    assert.equal(otp.verify('U-TEST', code).reason, 'no_code');
  });

  it('rechaza código incorrecto', () => {
    const code = otp.generate('U-TEST-2');
    const wrong = code === '123456' ? '654321' : '123456';
    assert.equal(otp.verify('U-TEST-2', wrong).reason, 'invalid_code');
    assert.equal(otp.verify('U-TEST-2', '12').reason, 'invalid_code');
  });
});
