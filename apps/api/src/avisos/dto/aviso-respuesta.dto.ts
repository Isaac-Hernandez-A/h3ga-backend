import { ApiProperty } from '@nestjs/swagger';
import { TipoAviso } from '../../common/enums/db-enums';

// Aviso tal como lo ve el usuario: las columnas de `avisos` más los datos de su origen (etapa o cita),
// del cliente y del asesor dueño. Del asesor solo se expone el nombre, nunca el correo ni otros datos.
export class AvisoRespuesta {
  @ApiProperty({ example: '0b1e6f1c-6f7a-4a53-9c1d-3c1f0f3f2a10' })
  id: string;

  @ApiProperty({ enum: TipoAviso, enumName: 'tipo_aviso', example: 'tramite' })
  tipo: TipoAviso;

  @ApiProperty({ type: String, nullable: true, example: '5d0a8b64-3f0e-4c7e-8d0b-0d7d2b5c9a11' })
  etapa_tramite_id: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  evento_id: string | null;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-10T05:00:00.000Z' })
  fecha_alerta: Date;

  @ApiProperty({ example: false })
  atendido: boolean;

  @ApiProperty({ type: String, nullable: true, example: null })
  atendido_por: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  fecha_atencion: Date | null;

  @ApiProperty({ example: 'f9fc07b8-677e-4e34-9ee4-7e6b43c605e3' })
  cliente_id: string;

  @ApiProperty({ description: 'Nombre y apellidos del cliente.', example: 'Rosa Pérez Ficticia' })
  cliente_nombre: string;

  @ApiProperty({
    description: 'Asesor dueño del cliente.',
    example: '16699b14-2d83-4fab-9d9d-1f4f16131f61',
  })
  asesor_id: string;

  @ApiProperty({ description: 'Nombre y apellido paterno del asesor.', example: 'Elena Rivas' })
  asesor_nombre: string;

  @ApiProperty({
    description: 'Trámite: nombre de la etapa. Cita: «Cita programada».',
    example: 'Revisión de semanas cotizadas',
  })
  titulo: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Trámite: acción a realizar de la etapa (null si no tiene). Cita: motivo del evento.',
    example: 'Entregar la constancia al cliente.',
  })
  descripcion: string | null;

  @ApiProperty({
    description: 'Fecha del compromiso de la etapa o fecha de la cita (AAAA-MM-DD).',
    example: '2026-11-12',
  })
  fecha_compromiso: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Solo citas (HH:mm:ss); null en trámites.',
    example: '10:00:00',
  })
  hora: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Paso de la etapa (0 a 15); null en citas.',
    example: 5,
  })
  numero_paso: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Avance de la etapa; null en citas.',
    example: 40,
  })
  avance_porcentaje: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'estatus_tramite.id de la etapa; null en citas.',
    example: 4,
  })
  estatus_id: number | null;
}
