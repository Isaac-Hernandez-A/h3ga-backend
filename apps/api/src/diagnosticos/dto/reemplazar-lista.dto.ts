import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray } from 'class-validator';

// Cuerpo de los PUT que reemplazan una lista completa del F1. La forma de cada elemento depende de la lista
// (se describe en cada ruta) y la valida el servicio.
export class ReemplazarListaDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    maxItems: 100,
    description: 'La lista completa: lo que no venga se borra. [] deja la lista vacía.',
  })
  @IsArray()
  @ArrayMaxSize(100)
  items: unknown[];
}
