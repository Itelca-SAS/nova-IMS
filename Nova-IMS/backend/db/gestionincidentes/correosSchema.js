function normalizeEmailStatus(status) {
  const valid = ['Activo', 'Inactivo'];
  const normalized = String(status || 'Activo').trim();
  return valid.includes(normalized) ? normalized : 'Activo';
}

module.exports = {
  normalizeEmailStatus,
};
