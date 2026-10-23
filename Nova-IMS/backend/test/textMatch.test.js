const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { trimTrailingSlashes, parseBracketHeader } = require('../utils/textMatch');

const ALPHABET = ['[', ']', ' ', '\t', '\n', '\r', ' ', 'a', 'B', '1', '/', ':'];

function randomText(max = 16) {
  const length = Math.floor(Math.random() * max);
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

describe('textMatch: equivalencia con las regex originales', () => {
  it('trimTrailingSlashes = replace(/\\/+$/, "")', () => {
    for (let i = 0; i < 20000; i++) {
      const s = randomText();
      assert.equal(trimTrailingSlashes(s), s.replace(/\/+$/, ''));
    }
    assert.equal(trimTrailingSlashes('https://ims.itelca.com.co//'), 'https://ims.itelca.com.co');
  });

  it('parseBracketHeader = /^\\[([^\\]]+)\\]\\s*(.*)$/', () => {
    for (let i = 0; i < 20000; i++) {
      const s = randomText();
      const m = /^\[([^\]]+)\]\s*(.*)$/.exec(s);
      assert.deepEqual(parseBracketHeader(s), m ? [m[1], m[2]] : null, JSON.stringify(s));
    }
    assert.deepEqual(parseBracketHeader('[10/06/2026, 12:00:00] Rogelio'), ['10/06/2026, 12:00:00', 'Rogelio']);
  });

  it('responde en tiempo lineal con textos maliciosos', () => {
    const start = Date.now();
    parseBracketHeader(`[a]${' '.repeat(30000)}\n`);
    trimTrailingSlashes(`${'/'.repeat(30000)}a`);
    assert.ok(Date.now() - start < 200);
  });
});
