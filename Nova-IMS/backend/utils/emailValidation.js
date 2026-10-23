function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (!email || /\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  const dot = domain.indexOf('.', 1);
  return dot !== -1 && dot < domain.length - 1;
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

module.exports = { isValidEmail, normalizeEmail };
