import { SetMetadata } from '@nestjs/common';

export const IS_PUBLICO_KEY = 'publico';

// Marca una ruta (o un controlador) como pública: no exige token ni roles.
// Toda ruta sin @Publico() debe declarar @Roles(...); sin ninguno de los dos se niega.
export const Publico = () => SetMetadata(IS_PUBLICO_KEY, true);
