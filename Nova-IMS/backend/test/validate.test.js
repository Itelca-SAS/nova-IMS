const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateBody } = require('../middleware/validate');
const schemas = require('../routes/schemas');

function run(schema, body) {
  let error = null;
  validateBody(schema)({ body }, {}, (err) => {
    error = err || null;
  });
  return error;
}

describe('validateBody', () => {
  it('acepta un login válido', () => {
    assert.equal(
      run(schemas.login, { agencia: 'CSJ', usuario: 'ana', password: 'x', rol: 'Juez', rememberMe: true }),
      null,
    );
  });

  it('exige los campos requeridos', () => {
    const err = run(schemas.login, { agencia: 'CSJ', usuario: 'ana' });
    assert.equal(err?.status, 400);
    assert.match(err.message, /password/);
  });

  it('rechaza textos más largos que la columna', () => {
    const err = run(schemas.incident, { location: 'x'.repeat(201) });
    assert.equal(err?.status, 400);
    assert.match(err.message, /200/);
  });

  it('acepta números donde se espera texto', () => {
    assert.equal(run(schemas.incident, { phone: 3001234567 }), null);
  });

  it('exige listas para los involucrados', () => {
    assert.equal(run(schemas.incident, { involvedPeople: [] }), null);
    assert.equal(run(schemas.incident, { involvedPeople: 'x' })?.status, 400);
  });

  it('rechaza objetos donde se espera texto', () => {
    assert.equal(run(schemas.forgotPassword, { agencia: 'CSJ', usuario: { $ne: '' } })?.status, 400);
  });

  it('valida valores permitidos del canal', () => {
    assert.equal(run(schemas.locationRequest, { phone: '3001234567', channel: 'sms' }), null);
    assert.equal(run(schemas.locationRequest, { phone: '3001234567', channel: 'email' })?.status, 400);
  });

  it('ignora campos opcionales vacíos', () => {
    assert.equal(run(schemas.operator, { email: '', telefono: null }), null);
  });

  it('rechaza un cuerpo que no es objeto', () => {
    assert.equal(run(schemas.incident, [1, 2])?.status, 400);
  });
});
