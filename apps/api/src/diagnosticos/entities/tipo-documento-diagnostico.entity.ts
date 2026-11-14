import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Documentos requeridos para el análisis del F1 (sección 2 del formato oficial).
@Entity('tipo_documento_diagnostico')
export class TipoDocumentoDiagnostico {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
