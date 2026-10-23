import { describe, it, expect } from 'vitest';
import {
  parseBracketHeader,
  splitLabelColon,
  splitParenSuffix,
  textAfterMarker,
  trimTrailingSlashes,
} from './text-match';

const ALPHABET = ['[', ']', '(', ')', ':', ' ', '\t', '\n', '\r', ' ', 'a', 'B', '1', '-', '>', '→', '/'];

function randomText(max = 16): string {
  const length = Math.floor(Math.random() * max);
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

function groups(match: RegExpExecArray | null): [string, string] | null {
  return match ? [match[1], match[2]] : null;
}

function forRandomTexts(check: (text: string) => void): void {
  for (let i = 0; i < 20000; i++) check(randomText());
}

describe('text-match: equivalencia con las regex originales', () => {
  it('trimTrailingSlashes = replace(/\\/+$/, "")', () => {
    forRandomTexts((s) => expect(trimTrailingSlashes(s)).toBe(s.replace(/\/+$/, '')));
    expect(trimTrailingSlashes('https://ims.itelca.com.co///')).toBe('https://ims.itelca.com.co');
  });

  it('textAfterMarker = /→\\s*(.+)$/ y /->\\s*(.+)$/', () => {
    forRandomTexts((s) => {
      expect(textAfterMarker(s, '→')).toBe(/→\s*(.+)$/.exec(s)?.[1] ?? null);
      expect(textAfterMarker(s, '->')).toBe(/->\s*(.+)$/.exec(s)?.[1] ?? null);
    });
    expect(textAfterMarker('Estado: Nuevo → En gestión OSEG', '→')).toBe('En gestión OSEG');
  });

  it('parseBracketHeader = /^\\[([^\\]]+)\\]\\s*(.*)$/', () => {
    forRandomTexts((s) => expect(parseBracketHeader(s)).toEqual(groups(/^\[([^\]]+)\]\s*(.*)$/.exec(s))));
    expect(parseBracketHeader('[23/10/2026, 10:41] Rogelio')).toEqual(['23/10/2026, 10:41', 'Rogelio']);
  });

  it('splitParenSuffix = /^(.+?)\\s*\\((.+)\\)\\s*$/ sobre texto recortado', () => {
    forRandomTexts((raw) => {
      const s = raw.trim();
      expect(splitParenSuffix(s)).toEqual(groups(/^(.+?)\s*\((.+)\)\s*$/.exec(s)));
    });
    expect(splitParenSuffix('Estado (Nuevo → Cerrado)')).toEqual(['Estado', 'Nuevo → Cerrado']);
  });

  it('splitLabelColon = /^([^:]{1,48}):\\s*(.+)$/', () => {
    forRandomTexts((s) => expect(splitLabelColon(s)).toEqual(groups(/^([^:]{1,48}):\s*(.+)$/.exec(s))));
    expect(splitLabelColon(`${'x'.repeat(49)}: y`)).toBeNull();
    expect(splitLabelColon('Prioridad: Alta')).toEqual(['Prioridad', 'Alta']);
  });

  it('responde en tiempo lineal con textos maliciosos', () => {
    const spaces = ' '.repeat(30000);
    const start = Date.now();
    splitParenSuffix(`(${spaces}a)`);
    textAfterMarker(`→${spaces}\n`, '→');
    splitLabelColon(`a:${spaces}\n`);
    parseBracketHeader(`[a]${spaces}\n`);
    trimTrailingSlashes(`${'/'.repeat(30000)}a`);
    expect(Date.now() - start).toBeLessThan(200);
  });
});
