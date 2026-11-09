import { PeriodoReporte } from '../common/fechas';

// Reporte operativo por periodo (RF-31 a RF-34). Solo cubre las etapas 0 a 4 (F0 a F4). Son clases para que
// Swagger documente la respuesta.

export class FilaCartera {
  numero_paso: number;
  nombre: string;
  total: number;
  // Una clave por cada estatus (en el orden de `cartera.estatus`), aunque valga 0.
  por_estatus: Record<string, number>;
}

export class Cartera {
  estatus: string[];
  etapas: FilaCartera[];
}

export class EtapaFinalizada {
  cliente: string;
  numero_paso: number;
  etapa: string;
  fecha_completada: string;
}

export class Finalizados {
  total: number;
  // Las 10 más recientes.
  lista: EtapaFinalizada[];
}

export class EtapaPorVencer {
  cliente: string;
  numero_paso: number;
  etapa: string;
  fecha_compromiso: string;
  situacion: 'vencido' | 'por_vencer';
}

export class Vencimientos {
  vencidos: number;
  por_vencer: number;
  // Las 10 más atrasadas o más próximas.
  lista: EtapaPorVencer[];
}

export class MotivoRechazo {
  motivo: string;
  total: number;
}

export class Rechazo {
  // Fracción de 0 a 1: bloqueos con motivo entre las etapas con algún cambio de estatus en el periodo.
  tasa: number;
  bloqueos: number;
  etapas_con_cambios: number;
  // Los 5 motivos más frecuentes.
  motivos: MotivoRechazo[];
}

export class ClientesPorRegimen {
  regimen: string;
  total: number;
}

export class ClientesNuevos {
  total: number;
  por_regimen: ClientesPorRegimen[];
}

export class AvanceDeAsesor {
  asesor_id: string;
  asesor: string;
  clientes: number;
  // Promedio simple del avance de sus etapas 0 a 4 (sin contar "No aplica").
  avance_promedio: number;
}

export class ReporteOperativo {
  periodo: PeriodoReporte;
  desde: string;
  hasta: string;
  // Fecha de hoy en Cancún (referencia de vencidos y por vencer).
  hoy: string;
  alcance: 'asesor' | 'supervisor';
  cartera: Cartera;
  finalizados: Finalizados;
  vencimientos: Vencimientos;
  rechazo: Rechazo;
  clientes_nuevos: ClientesNuevos;
  // Solo para el supervisor.
  por_asesor?: AvanceDeAsesor[];
}
