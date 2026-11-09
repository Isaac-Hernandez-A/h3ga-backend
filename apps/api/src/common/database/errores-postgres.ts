import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

// Códigos de error de PostgreSQL que los servicios traducen a respuestas HTTP.
export const PG_VIOLACION_UNICA = '23505';
export const PG_VIOLACION_LLAVE_FORANEA = '23503';
// Valores que PostgreSQL rechaza aunque pasen la validación de formato: fuera de rango, fecha imposible.
const PG_DATO_INVALIDO = ['22003', '22007', '22008', '22P02'];

export function codigoPostgres(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const { driverError, code } = error as QueryFailedError & {
    driverError?: { code?: string };
    code?: string;
  };
  return driverError?.code ?? code;
}

// Traduce un error de la base a 409 (unicidad) o 400 (llave foránea o dato inválido); el resto se relanza.
export function traducirErrorBd(
  error: unknown,
  mensajes: { unica?: string; llaveForanea?: string; dato?: string },
): never {
  const codigo = codigoPostgres(error);
  if (codigo === PG_VIOLACION_UNICA) {
    throw new ConflictException(mensajes.unica ?? 'El registro ya existe.');
  }
  if (codigo === PG_VIOLACION_LLAVE_FORANEA) {
    throw new BadRequestException(mensajes.llaveForanea ?? 'Un valor referenciado no existe.');
  }
  if (codigo && PG_DATO_INVALIDO.includes(codigo)) {
    throw new BadRequestException(mensajes.dato ?? 'Algún valor enviado no es válido.');
  }
  throw error;
}
