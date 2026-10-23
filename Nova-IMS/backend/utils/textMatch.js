/**
 * Reemplazos lineales de expresiones regulares con backtracking (ReDoS).
 * Cada función reproduce exactamente la regex indicada en su comentario.
 */

const LINE_BREAKS = new Set(['\n', '\r', ' ', ' ']);

function isSpace(char) {
  return /\s/.test(char);
}

function lastLineBreakIndex(text) {
  for (let i = text.length - 1; i >= 0; i--) {
    if (LINE_BREAKS.has(text[i])) return i;
  }
  return -1;
}

/** `value.replace(/\/+$/, '')` */
function trimTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}

/** Grupos de `/^\[([^\]]+)\]\s*(.*)$/`, o null. */
function parseBracketHeader(line) {
  const close = line.indexOf(']');
  if (!line.startsWith('[') || close < 2) return null;
  let pos = close + 1;
  while (pos < line.length && isSpace(line[pos])) pos++;
  if (pos <= lastLineBreakIndex(line)) return null;
  return [line.slice(1, close), line.slice(pos)];
}

module.exports = { trimTrailingSlashes, parseBracketHeader };
