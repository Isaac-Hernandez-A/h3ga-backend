import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const ORIGEN_POR_DEFECTO = 'http://localhost:3000';

// CORS_ORIGINS: lista de orígenes separados por comas (p. ej. "http://localhost:3000,http://127.0.0.1:3000").
// Sin valor, solo el frontend local. Nunca se admite el comodín ni entradas vacías: un error de captura no
// debe abrir la API a otros orígenes.
export function origenesPermitidos(valor: string | undefined): string[] {
  if (valor === undefined || valor.trim() === '') return [ORIGEN_POR_DEFECTO];
  const entradas = valor.split(',').map((origen) => origen.trim());
  if (entradas.some((origen) => origen.includes('*'))) {
    throw new Error('CORS_ORIGINS no admite comodines: lista cada origen permitido.');
  }
  if (entradas.some((origen) => origen === '')) {
    throw new Error('CORS_ORIGINS tiene una entrada vacía: revisa las comas.');
  }
  return entradas.map((origen) => origen.replace(/\/+$/, ''));
}

// Solo lo que el frontend necesita: sin credenciales (el token va en Authorization), con Content-Disposition
// expuesta para que el navegador lea el nombre de las descargas de PDF.
export function opcionesCors(valor: string | undefined): CorsOptions {
  return {
    origin: origenesPermitidos(valor),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Disposition'],
    credentials: false,
  };
}
