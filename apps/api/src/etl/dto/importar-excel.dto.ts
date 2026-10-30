import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

// Esbozo: la carga multipart (FileInterceptor) se conecta al implementar el ETL.
export class ImportarExcelDto {
  @IsOptional()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo Excel (.xlsx) a importar.',
  })
  archivo: unknown;
}
