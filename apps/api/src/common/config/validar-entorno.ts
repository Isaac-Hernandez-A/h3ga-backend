import { origenesPermitidos } from './cors';
import { opcionesSslBd } from './ssl-bd';
import { VARIABLES_SPACES } from '../../documentos/storage/variables-spaces';

// Marcador que trae .env.example; nunca debe usarse como secreto real.
export const JWT_SECRET_EJEMPLO = 'CAMBIAR_SECRETO_JWT';

// Se ejecuta al cargar la configuración: si lanza, la aplicación no arranca.
export function validarEntorno(config: Record<string, unknown>): Record<string, unknown> {
  if (config.NODE_ENV === 'production') {
    const secreto = config.JWT_SECRET;
    if (typeof secreto !== 'string' || secreto.trim() === '' || secreto === JWT_SECRET_EJEMPLO) {
      throw new Error(
        'JWT_SECRET falta o es el valor de ejemplo: la aplicación no arranca en producción.',
      );
    }
  }
  validarAlmacenamiento(config);
  validarCors(config);
  validarSslBd(config);
  return config;
}

// STORAGE_DRIVER: local (por defecto) o spaces. Con spaces deben estar las cinco variables SPACES_*; el
// mensaje nombra las que faltan, nunca sus valores.
function validarAlmacenamiento(config: Record<string, unknown>): void {
  const driver = typeof config.STORAGE_DRIVER === 'string' ? config.STORAGE_DRIVER.trim() : '';
  if (driver === '' || driver === 'local') return;
  if (driver !== 'spaces') {
    throw new Error(`STORAGE_DRIVER debe ser "local" o "spaces" (recibido: "${driver}").`);
  }
  const faltan = VARIABLES_SPACES.filter((nombre) => {
    const valor = config[nombre];
    return typeof valor !== 'string' || valor.trim() === '';
  });
  if (faltan.length > 0) {
    throw new Error(`STORAGE_DRIVER=spaces requiere definir: ${faltan.join(', ')}.`);
  }
}

// CORS_ORIGINS: sin comodines ni entradas vacías (origenesPermitidos lanza un error que nombra la variable).
function validarCors(config: Record<string, unknown>): void {
  const valor = config.CORS_ORIGINS;
  if (valor !== undefined) origenesPermitidos(typeof valor === 'string' ? valor : '');
}

// DATABASE_SSL: true, no-verify o false; y la CA (DATABASE_SSL_CA / _BASE64) debe ser legible. opcionesSslBd
// lanza un error que nombra la variable, no su valor.
function validarSslBd(config: Record<string, unknown>): void {
  const texto = (v: unknown) => (typeof v === 'string' ? v : undefined);
  if (config.DATABASE_SSL === undefined) return;
  opcionesSslBd({
    DATABASE_SSL: texto(config.DATABASE_SSL) ?? '',
    DATABASE_SSL_CA: texto(config.DATABASE_SSL_CA),
    DATABASE_SSL_CA_BASE64: texto(config.DATABASE_SSL_CA_BASE64),
  });
}
