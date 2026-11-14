import { EntityManager } from 'typeorm';
import { DIAS_ANTES_AVISO, ZONA } from '../common/fechas';

// 00:00 de Cancún del día (fecha − 2 días): la hora a la que comienza la alerta. Es la clave de unicidad
// (origen, fecha_alerta) de los avisos.
export const alertaDe = (columnaFecha: string) =>
  `(CAST(${columnaFecha} - ${DIAS_ANTES_AVISO} AS timestamp) AT TIME ZONE '${ZONA}')`;

// Un evento de agenda califica para aviso mientras sea un compromiso por cumplir: pendiente o reagendado.
// Cumplido y cancelado no generan avisos.
export const ESTATUS_EVENTO_CON_AVISO = "('pendiente', 'reagendado')";

// Si el compromiso (etapa o cita) se movió a una fecha cuya alerta ya existía y estaba atendida, esa alerta
// vuelve a quedar pendiente. Solo toca el aviso de ESA fecha de alerta; los de otras fechas no cambian. Se
// ejecuta con el `manager` de la transacción que cambia la fecha, para que ambos cambios sean atómicos.
export async function reabrirAvisoAtendido(
  manager: EntityManager,
  origen: { etapaTramiteId: string } | { eventoId: string },
  fechaNueva: string,
): Promise<void> {
  const columna = 'etapaTramiteId' in origen ? 'etapa_tramite_id' : 'evento_id';
  const id = 'etapaTramiteId' in origen ? origen.etapaTramiteId : origen.eventoId;
  await manager.query(
    `UPDATE avisos
        SET atendido = false, atendido_por = NULL, fecha_atencion = NULL
      WHERE ${columna} = $1
        AND fecha_alerta = ${alertaDe('CAST($2 AS date)')}
        AND atendido = true`,
    [id, fechaNueva],
  );
}
