// Reglas de avance de una etapa (RF-18 y diccionario, tabla etapas_tramite). Funciones puras: no tocan la base.

export type NombreEstatus =
  | 'No aplica'
  | 'Por iniciar'
  | 'En proceso cliente'
  | 'En proceso asesor'
  | 'En proceso Instituto'
  | 'Finalizado'
  | 'Bloqueado'
  | 'Cancelado'
  | 'Detenido';

export const AVANCE_POR_INICIAR = 10;
export const AVANCE_FINALIZADO = 100;
export const AVANCE_EN_PROCESO_MIN = 20;
export const AVANCE_EN_PROCESO_MAX = 90;

export class AvanceInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'AvanceInvalidoError';
  }
}

const EN_PROCESO: readonly NombreEstatus[] = [
  'En proceso cliente',
  'En proceso asesor',
  'En proceso Instituto',
];
const EXCEPCION: readonly NombreEstatus[] = ['Bloqueado', 'Cancelado', 'Detenido'];

const dentroDeRango = (avance: number) =>
  Number.isInteger(avance) && avance >= AVANCE_EN_PROCESO_MIN && avance <= AVANCE_EN_PROCESO_MAX;

// Avance que le corresponde a la etapa al pasar a `estatusNuevo`.
//  - Por iniciar: 10. Finalizado: 100 (se ignora el avance solicitado).
//  - En proceso: el solicitado, entero entre 20 y 90. Si no se pide uno, se conserva el previo siempre
//    que ya esté en rango (p. ej. al reactivar una etapa congelada); si no, hay que indicarlo.
//  - Bloqueado, Cancelado, Detenido y No aplica: conservan el avance previo (congelado).
export function calcularAvance(entrada: {
  estatusNuevo: NombreEstatus;
  avancePrevio: number;
  avanceSolicitado?: number;
}): number {
  const { estatusNuevo, avancePrevio, avanceSolicitado } = entrada;
  if (estatusNuevo === 'Por iniciar') return AVANCE_POR_INICIAR;
  if (estatusNuevo === 'Finalizado') return AVANCE_FINALIZADO;
  if (EN_PROCESO.includes(estatusNuevo)) {
    const avance = avanceSolicitado ?? avancePrevio;
    if (!dentroDeRango(avance)) {
      throw new AvanceInvalidoError(
        `En "${estatusNuevo}" el avance debe ser un entero entre ${AVANCE_EN_PROCESO_MIN} y ${AVANCE_EN_PROCESO_MAX}.`,
      );
    }
    return avance;
  }
  return avancePrevio;
}

// Reactivación: de Bloqueado, Cancelado o Detenido a un estatus activo (no excepción ni No aplica).
export function esReactivacion(anterior: NombreEstatus, nuevo: NombreEstatus): boolean {
  return EXCEPCION.includes(anterior) && nuevo !== 'No aplica' && !EXCEPCION.includes(nuevo);
}
