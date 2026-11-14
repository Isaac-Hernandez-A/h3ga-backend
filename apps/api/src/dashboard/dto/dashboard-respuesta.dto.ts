import { ApiProperty } from '@nestjs/swagger';

const UUID = '16699b14-2d83-4fab-9d9d-1f4f16131f61';

export class ResumenDashboard {
  @ApiProperty({
    example: 42,
    description: 'Clientes cuya etapa 15 (Finalización) no está Finalizada.',
  })
  clientes_activos: number;

  @ApiProperty({ example: 7, description: 'Clientes con la etapa 15 Finalizada.' })
  clientes_pensionados: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 5,
    description: 'Usuarios con rol asesor y activo. Solo para el supervisor; null para los demás.',
  })
  asesores_activos: number | null;

  @ApiProperty({ example: 9, description: 'Acciones del mes con estado «proxima».' })
  acciones_proximas_mes: number;

  @ApiProperty({
    example: 11,
    description: 'Documentos de clientes activos con estatus por_confirmar.',
  })
  documentos_por_confirmar: number;

  @ApiProperty({
    example: 3,
    description: 'Documentos de clientes activos con estatus no (no válidos).',
  })
  documentos_con_observaciones: number;

  @ApiProperty({ example: 4, description: 'Clientes activos con avance detenido.' })
  clientes_avance_detenido: number;
}

export class ClientesPorEtapa {
  @ApiProperty({ example: 1, minimum: 0, maximum: 15 })
  numero_paso: number;

  @ApiProperty({ example: 'Diagnóstico especializado' })
  nombre: string;

  @ApiProperty({ example: 6, description: 'Clientes activos cuya etapa actual es esta.' })
  clientes: number;
}

export class DocumentosPorEstatus {
  @ApiProperty({ example: 120 })
  si: number;

  @ApiProperty({ example: 11 })
  por_confirmar: number;

  @ApiProperty({ example: 3 })
  no: number;
}

export class AccionDelMes {
  @ApiProperty({ example: UUID }) cliente_id: string;
  @ApiProperty({ example: 'Rosa Pérez Ficticia' }) cliente_nombre: string;
  @ApiProperty({ example: UUID }) asesor_id: string;
  @ApiProperty({ example: 'Elena Rivas', description: 'Nombre y apellido paterno.' })
  asesor_nombre: string;
  @ApiProperty({ example: 3 }) numero_paso: number;
  @ApiProperty({ example: 'Unificación de NSS' }) etapa: string;
  @ApiProperty({ example: '2026-11-20', description: 'AAAA-MM-DD' }) fecha_compromiso: string;
  @ApiProperty({ type: String, nullable: true, example: 'Entregar la constancia al cliente.' })
  accion_a_realizar: string | null;
  @ApiProperty({ enum: ['completada', 'proxima', 'vencida'], example: 'proxima' })
  estado: 'completada' | 'proxima' | 'vencida';
}

export class DocumentoPendiente {
  @ApiProperty({ example: UUID }) documento_id: string;
  @ApiProperty({ example: UUID }) cliente_id: string;
  @ApiProperty({ example: 'Rosa Pérez Ficticia' }) cliente_nombre: string;
  @ApiProperty({ example: 2 }) tipo_documento_id: number;
  @ApiProperty({ example: 'Acta de nacimiento' }) tipo_documento: string;
  @ApiProperty({ enum: ['por_confirmar', 'no'], example: 'por_confirmar' })
  estatus: 'por_confirmar' | 'no';
  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-03T15:00:00.000Z' })
  fecha_carga: Date;
  @ApiProperty({ example: UUID }) subido_por_id: string;
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Elena Rivas',
    description: 'Nombre y apellido paterno; null si el usuario ya no existe.',
  })
  subido_por_nombre: string | null;
  @ApiProperty({ example: 'Diagnóstico especializado' }) etapa_actual: string;
}

export class ClienteDetenido {
  @ApiProperty({ example: UUID }) cliente_id: string;
  @ApiProperty({ example: 'Rosa Pérez Ficticia' }) cliente_nombre: string;
  @ApiProperty({ example: UUID }) asesor_id: string;
  @ApiProperty({ example: 'Elena Rivas' }) asesor_nombre: string;
  @ApiProperty({ example: 'Diagnóstico especializado' }) etapa_actual: string;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 9,
    description: 'estatus_tramite.id de la etapa actual.',
  })
  estatus_id: number | null;
  @ApiProperty({ type: String, nullable: true, example: 'Detenido' }) estatus: string | null;
  @ApiProperty({ example: '2026-10-31', description: 'AAAA-MM-DD (fecha de Cancún).' })
  ultima_actividad: string;
  @ApiProperty({ example: 15 }) dias_sin_actividad: number;
}

export class CargaPorAsesor {
  @ApiProperty({ example: UUID }) asesor_id: string;
  @ApiProperty({ example: 'Elena Rivas' }) asesor_nombre: string;
  @ApiProperty({ example: 8 }) clientes_activos: number;
  @ApiProperty({ example: 2 }) clientes_detenidos: number;
  @ApiProperty({ example: 1 }) clientes_pensionados: number;
}

export class AvanceClienteEtapa {
  @ApiProperty({ example: 1, minimum: 0, maximum: 15 }) numero_paso: number;
  @ApiProperty({
    example: 40,
    description: 'avance_porcentaje de la etapa (0 si el cliente no la tiene).',
  })
  avance_porcentaje: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 4,
    description: 'estatus_tramite.id de la etapa; null si el cliente no tiene esa etapa.',
  })
  estatus_id: number | null;
}

export class AvanceCliente {
  @ApiProperty({ example: UUID }) cliente_id: string;
  @ApiProperty({ example: 'Rosa Pérez Ficticia' }) cliente_nombre: string;
  @ApiProperty({
    type: AvanceClienteEtapa,
    isArray: true,
    description: 'Siempre las 16 etapas (0 a 15), en orden.',
  })
  etapas: AvanceClienteEtapa[];
}

export class DashboardRespuesta {
  @ApiProperty({ example: '2026-11-15', description: 'Hoy en America/Cancun (AAAA-MM-DD).' })
  fecha: string;

  @ApiProperty({ type: ResumenDashboard })
  resumen: ResumenDashboard;

  @ApiProperty({
    type: ClientesPorEtapa,
    isArray: true,
    description: 'Siempre las 16 etapas (0 a 15).',
  })
  clientes_por_etapa: ClientesPorEtapa[];

  @ApiProperty({ type: DocumentosPorEstatus })
  documentos_por_estatus: DocumentosPorEstatus;

  @ApiProperty({
    type: AccionDelMes,
    isArray: true,
    description: 'Por fecha_compromiso y luego cliente_nombre; limitada por ?limite.',
  })
  acciones_del_mes: AccionDelMes[];

  @ApiProperty({ example: 14, description: 'Total de acciones del mes, sin límite.' })
  total_acciones_del_mes: number;

  @ApiProperty({
    type: DocumentoPendiente,
    isArray: true,
    description: 'por_confirmar y no, por fecha_carga ascendente; limitada por ?limite.',
  })
  documentos_pendientes: DocumentoPendiente[];

  @ApiProperty({ example: 14, description: 'Total de documentos pendientes, sin límite.' })
  total_documentos_pendientes: number;

  @ApiProperty({
    type: ClienteDetenido,
    isArray: true,
    description:
      'Más días sin actividad primero; limitada por ?limite. El total es resumen.clientes_avance_detenido.',
  })
  clientes_detenidos: ClienteDetenido[];

  @ApiProperty({
    type: CargaPorAsesor,
    isArray: true,
    nullable: true,
    description: 'Solo el supervisor (todos los asesores con clientes); null para los demás.',
  })
  carga_por_asesor: CargaPorAsesor[] | null;

  @ApiProperty({
    type: AvanceCliente,
    isArray: true,
    nullable: true,
    description:
      'Solo el asesor: una fila por cliente activo (por cliente_nombre), con las 16 etapas y su avance. ' +
      'Tope de 200 clientes; no lo limita ?limite. Null para el auxiliar y el supervisor.',
  })
  avance_por_cliente: AvanceCliente[] | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 42,
    description:
      'Total real de clientes activos del asesor (puede ser mayor que 200). Null para los demás.',
  })
  total_avance_por_cliente: number | null;
}
