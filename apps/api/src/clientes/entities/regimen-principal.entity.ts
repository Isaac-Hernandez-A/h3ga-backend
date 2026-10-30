import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('regimen_principal')
export class RegimenPrincipal {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
