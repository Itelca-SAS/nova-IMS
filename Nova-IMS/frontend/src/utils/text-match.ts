/**
 * Reemplazos lineales de expresiones regulares con backtracking (ReDoS).
 * Cada función reproduce exactamente la regex indicada en su comentario.
 */

const LINE_BREAKS = new Set(['\n', '\r', ' ', ' ']);

function isLineBreak(char: string): boolean {
  return LINE_BREAKS.has(char);
}

function isSpace(char: string): boolean {
  return /\s/.test(char);
}

function lastLineBreakIndex(text: string): number {
  for (let i = text.length - 1; i >= 0; i--) {
    if (isLineBreak(text[i])) return i;
  }
  return -1;
}

/** `\s*(.+)$` (o `\s*(.*)$` con allowEmpty) aplicado desde `start`. */
function restOfLineAfterSpaces(
  text: string,
  start: number,
  allowEmpty: boolean,
  lastBreak = lastLineBreakIndex(text),
): string | null {
  let pos = start;
  while (pos < text.length && isSpace(text[pos])) pos++;
  if (!allowEmpty && pos === text.length) pos = text.length - 1;
  if (pos < start || pos <= lastBreak) return null;
  return text.slice(pos);
}

/** `value.replace(/\/+$/, '')` */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}

/** Grupo 1 de `/<marker>\s*(.+)$/` (primera coincidencia), o null. */
export function textAfterMarker(text: string, marker: string): string | null {
  const lastBreak = lastLineBreakIndex(text);
  let index = text.indexOf(marker);
  while (index !== -1) {
    const rest = restOfLineAfterSpaces(text, index + marker.length, false, lastBreak);
    if (rest !== null) return rest;
    index = text.indexOf(marker, index + 1);
  }
  return null;
}

/** Grupos de `/^\[([^\]]+)\]\s*(.*)$/`, o null. */
export function parseBracketHeader(line: string): [string, string] | null {
  const close = line.indexOf(']');
  if (!line.startsWith('[') || close < 2) return null;
  const rest = restOfLineAfterSpaces(line, close + 1, true);
  return rest === null ? null : [line.slice(1, close), rest];
}

/** Grupos de `/^(.+?)\s*\((.+)\)\s*$/` sobre un texto ya recortado, o null. */
export function splitParenSuffix(text: string): [string, string] | null {
  if (!text.endsWith(')')) return null;
  const lastBreak = lastLineBreakIndex(text);
  let next = 0;
  for (let i = 1; i < text.length; i++) {
    if (isLineBreak(text[i - 1])) return null;
    if (next < i) next = i;
    while (next < text.length && isSpace(text[next])) next++;
    if (text[next] === '(' && next + 1 < text.length - 1 && next + 1 > lastBreak) {
      return [text.slice(0, i), text.slice(next + 1, -1)];
    }
  }
  return null;
}

/** Grupos de `/^([^:]{1,48}):\s*(.+)$/`, o null. */
export function splitLabelColon(text: string): [string, string] | null {
  const colon = text.indexOf(':');
  if (colon < 1 || colon > 48) return null;
  const rest = restOfLineAfterSpaces(text, colon + 1, false);
  return rest === null ? null : [text.slice(0, colon), rest];
}
