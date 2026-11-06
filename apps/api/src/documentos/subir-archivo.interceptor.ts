import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TAMANO_MAXIMO } from './reglas-archivo';

// Recibe un solo archivo en el campo "archivo"; sin dest ni storage multer lo deja en memoria. El límite de multer es un poco mayor que el
// permitido: un archivo apenas pasado de 10 MB lo rechaza el servicio con 400, y uno mucho mayor se corta
// aquí, pero también con 400 (no 413), para que el contrato sea uno solo.
const MAXIMO_RECIBIDO = TAMANO_MAXIMO + 1;

export class SubirArchivoInterceptor extends FileInterceptor('archivo', {
  limits: { fileSize: MAXIMO_RECIBIDO, files: 1 },
}) {
  override async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      return await super.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new BadRequestException('El archivo supera el máximo de 10 MB.');
      }
      throw error;
    }
  }
}
