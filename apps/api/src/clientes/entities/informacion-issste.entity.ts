import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('informacion_issste')
export class InformacionIssste {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  historial_laboral_id: string;

  @Column({ type: 'varchar', length: 20 })
  nss_issste: string;

  @Column({ type: 'text' })
  regimen_pensionario: string;

  // NUMERIC(5,2): PostgreSQL lo devuelve como texto y numericTransformer lo expone como número.
  @ApiProperty({ type: Number, nullable: true, example: 18.5 })
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  anios_laborados: number | null;

  @Column({ type: 'boolean' })
  activo: boolean;
}
