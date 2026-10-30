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
  return config;
}
