import { ApiProperty } from '@nestjs/swagger';

// Respuesta de GET /correcciones: resumen por cliente de las etapas 2 (F2 Correcciones), 3 (F3 Unificación
// de NSS) y 4 (F4 Recuperación de semanas).

export class ResumenCorrecciones {
  @ApiProperty({
    example: 12,
    description:
      'Clientes del asesor que requieren al menos una fase (todos, aunque la lista se corte en 500).',
  })
  clientes_con_correcciones: number;

  @ApiProperty({
    example: 7,
    description: 'Fases F3 o F4 con requiere = true y documentos_cargados = 0.',
  })
  documentos_por_subir: number;
}

export class FaseCorreccion {
  @ApiProperty({ enum: [2, 3, 4], example: 2 })
  numero_paso: 2 | 3 | 4;

  @ApiProperty({ type: String, nullable: true, example: '5d0a8b64-3f0e-4c7e-8d0b-0d7d2b5c9a11' })
  etapa_tramite_id: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 4,
    description: 'null si el cliente no tiene la etapa.',
  })
  estatus_id: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'En proceso asesor' })
  estatus: string | null;

  @ApiProperty({ example: 40, description: '0 si el cliente no tiene la etapa.' })
  avance_porcentaje: number;

  @ApiProperty({ type: String, nullable: true, example: '2026-12-01', description: 'AAAA-MM-DD' })
  fecha_compromiso: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Pedir el acta de nacimiento.' })
  accion_a_realizar: string | null;

  @ApiProperty({
    example: true,
    description:
      'F2: tiene alguna corrección que no es de unificación de NSS. F3: tiene una de unificación de NSS. ' +
      'F4: su diagnóstico especializado (F1) tiene análisis de recuperación de semanas con aplica «si» o ' +
      '«requiere_mas_evidencia».',
  })
  requiere: boolean;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2,
    description:
      'Solo F2: cuántas correcciones tiene (sin contar las de unificación de NSS). null en F3 y F4.',
  })
  correcciones: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1,
    description:
      'F3: documentos cargados de «Certificación de regularización… (IMSS)». F4: de «Constancia de ' +
      'Aclaración de Semanas Cotizadas (IMSS)» y «Solicitud de Reintegro de Recursos (AFORE)». null en F2.',
  })
  documentos_cargados: number | null;
}

export class ClienteCorrecciones {
  @ApiProperty({ example: 'f9fc07b8-677e-4e34-9ee4-7e6b43c605e3' })
  cliente_id: string;

  @ApiProperty({ example: 'Rosa Pérez Ficticia' })
  cliente_nombre: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-10T15:00:00.000Z',
    description:
      'Mayor actualizado_el entre las etapas 2, 3 y 4. Sin etapas: la fecha de ingreso del cliente (00:00 de Cancún).',
  })
  actualizado_el: Date;

  @ApiProperty({
    type: FaseCorreccion,
    isArray: true,
    description: 'Siempre las 3 fases, en orden 2, 3, 4.',
  })
  fases: FaseCorreccion[];
}

export class CorreccionesListadoRespuesta {
  @ApiProperty({ type: ResumenCorrecciones })
  resumen: ResumenCorrecciones;

  @ApiProperty({
    type: ClienteCorrecciones,
    isArray: true,
    description:
      'Solo clientes con al menos una fase requerida, por actualizado_el descendente; máximo 500.',
  })
  clientes: ClienteCorrecciones[];
}
