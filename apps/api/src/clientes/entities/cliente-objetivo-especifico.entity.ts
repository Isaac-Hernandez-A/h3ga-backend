import { Entity, PrimaryColumn } from 'typeorm';

@Entity('cliente_objetivos_especificos')
export class ClienteObjetivoEspecifico {
  @PrimaryColumn('uuid')
  cliente_id: string;

  @PrimaryColumn('smallint')
  objetivo_id: number;
}
