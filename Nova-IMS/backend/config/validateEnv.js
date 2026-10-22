const EXAMPLE_JWT_SECRET = 'cambia-esta-clave-en-produccion-es-muy-importante';
const MIN_JWT_SECRET_LENGTH = 32;

function validateEnv(env = process.env) {
  const errors = [];
  const isProduction = env.NODE_ENV === 'production';
  const secret = env.JWT_SECRET || '';

  if (!secret) {
    errors.push('JWT_SECRET es obligatorio.');
  } else if (isProduction && secret === EXAMPLE_JWT_SECRET) {
    errors.push('JWT_SECRET no puede ser el valor de ejemplo de .env.example en producción.');
  } else if (isProduction && secret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres en producción.`);
  }

  const cors = String(env.CORS_ORIGIN || '').trim();
  if (isProduction && (!cors || cors === '*')) {
    errors.push('CORS_ORIGIN debe indicar el dominio del frontend en producción (no "*").');
  }

  return errors;
}

module.exports = { validateEnv };
