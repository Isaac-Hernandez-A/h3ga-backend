import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstatusEventoAgenda } from '../../common/enums/db-enums';

@Entity('eventos_agenda')
export class EventoAgenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asesor_id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'enum', enum: EstatusEventoAgenda, enumName: 'estatus_evento_agenda' })
  estatus: EstatusEventoAgenda;
}
