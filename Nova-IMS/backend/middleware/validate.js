const HttpError = require('../utils/HttpError');

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function checkField(field, rule, value) {
  if (isEmpty(value)) {
    return rule.required ? `El campo ${field} es requerido.` : null;
  }
  if (rule.type === 'text') {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return `El campo ${field} debe ser texto.`;
    }
    if (rule.max && String(value).length > rule.max) {
      return `El campo ${field} no puede superar ${rule.max} caracteres.`;
    }
    if (rule.oneOf && !rule.oneOf.includes(value)) {
      return `El campo ${field} tiene un valor no permitido.`;
    }
  }
  if (rule.type === 'array' && !Array.isArray(value)) {
    return `El campo ${field} debe ser una lista.`;
  }
  if (rule.type === 'number' && !Number.isFinite(Number(value))) {
    return `El campo ${field} debe ser numérico.`;
  }
  if (rule.type === 'bool' && !['boolean', 'number', 'string'].includes(typeof value)) {
    return `El campo ${field} no es válido.`;
  }
  return null;
}

function validateBody(schema) {
  return (req, res, next) => {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      return next(new HttpError(400, 'El cuerpo de la solicitud no es válido.'));
    }
    for (const [field, rule] of Object.entries(schema)) {
      const error = checkField(field, rule, body[field]);
      if (error) return next(new HttpError(400, error));
    }
    next();
  };
}

module.exports = { validateBody, checkField };
