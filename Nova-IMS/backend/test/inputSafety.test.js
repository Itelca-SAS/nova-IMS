const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail } = require('../utils/emailValidation');
const { logId } = require('../utils/ids');
const { plainCommentText } = require('../db/gestionincidentes/incidents');

describe('plainCommentText', () => {
  it('quita el encabezado [fecha] autor', () => {
    assert.equal(plainCommentText('[10/06/2026, 12:00:00] Rogelio\nComentario de prueba'), 'Comentario de prueba');
  });

  it('quita varios encabezados seguidos y el separador', () => {
    assert.equal(plainCommentText('[a]\n[b] Autor\n---\nTexto'), 'Texto');
  });

  it('conserva el texto sin encabezado', () => {
    assert.equal(plainCommentText('Sin encabezado [x]'), 'Sin encabezado [x]');
  });

  it('no se bloquea con textos maliciosos largos', () => {
    const start = Date.now();
    plainCommentText(`[a]${' '.repeat(20000)}[`);
    assert.ok(Date.now() - start < 200);
  });
});

describe('isValidEmail', () => {
  it('acepta correos válidos', () => {
    assert.equal(isValidEmail('Usuario@Itelca.com.co'), true);
    assert.equal(isValidEmail('  a@b.co  '), true);
  });

  it('rechaza correos inválidos', () => {
    for (const value of ['', 'sin-arroba', '@b.co', 'a@b', 'a@.co', 'a@b.', 'a@@b.co', 'a b@c.co']) {
      assert.equal(isValidEmail(value), false, value);
    }
  });

  it('no se bloquea con textos maliciosos largos', () => {
    const start = Date.now();
    isValidEmail(`a@${'.'.repeat(50000)} `);
    assert.ok(Date.now() - start < 200);
  });
});

describe('logId', () => {
  it('mantiene el formato LOG-<fecha>-<número>', () => {
    assert.match(logId(), /^LOG-\d+-\d+$/);
  });

  it('no repite identificadores generados en el mismo instante', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => logId()));
    assert.equal(ids.size, 5000);
  });
});
