import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'smallint' })
  rol_id: number;

  @Column({ type: 'smallint', nullable: true })
  tipo_asesor_id: number | null;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  apellido_paterno: string;

  @Column({ type: 'text' })
  apellido_materno: string;

  @Column({ type: 'text' })
  correo_electronico: string;

  @ApiHideProperty()
  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  contrasena_hash: string;

  @Column({ type: 'boolean' })
  activo: boolean;

  @Column({ type: 'timestamptz' })
  fecha_creacion: Date;
}
