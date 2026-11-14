import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

// NOT_IMPLEMENTED -> "Not Implemented", igual que el formato que usa Nest en sus propios errores.
const nombreEstado = (statusCode: number): string =>
  (HttpStatus[statusCode] ?? 'Error')
    .toLowerCase()
    .replace(
      /(^|_)(\w)/g,
      (_, sep: string, letra: string) => `${sep ? ' ' : ''}${letra.toUpperCase()}`,
    );

// Errores 4xx que lanza el parser del cuerpo (http-errors, p. ej. 413 por un cuerpo de más de 100 KB): no son
// HttpException de Nest, pero son errores del cliente y no deben responder 500. Solo se toman los que traen un
// estado de cliente (400 a 499) y se marcan como exponibles.
function estadoDeClienteDelParser(excepcion: unknown): number | null {
  if (typeof excepcion !== 'object' || excepcion === null) return null;
  const { status, statusCode, expose } = excepcion as Record<string, unknown>;
  const estado = typeof statusCode === 'number' ? statusCode : status;
  return typeof estado === 'number' && estado >= 400 && estado < 500 && expose === true
    ? estado
    : null;
}

const MENSAJES_DEL_PARSER: Record<number, string> = {
  413: 'El cuerpo de la petición es demasiado grande.',
};

// Respuesta de error uniforme: { statusCode, error, message, path, timestamp }.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const esHttp = exception instanceof HttpException;
    const estadoParser = esHttp ? null : estadoDeClienteDelParser(exception);
    const statusCode = esHttp
      ? exception.getStatus()
      : (estadoParser ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const cuerpo = esHttp ? exception.getResponse() : null;
    const detalle =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};

    if (!esHttp && estadoParser === null) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode,
        error: typeof detalle.error === 'string' ? detalle.error : nombreEstado(statusCode),
        message: esHttp
          ? typeof cuerpo === 'string'
            ? cuerpo
            : (detalle.message ?? exception.message)
          : estadoParser !== null
            ? (MENSAJES_DEL_PARSER[estadoParser] ?? (exception as Error).message)
            : 'Error interno del servidor',
        ...(Array.isArray(detalle.faltantes) ? { faltantes: detalle.faltantes } : {}),
        path: httpAdapter.getRequestUrl(ctx.getRequest()) as string,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
