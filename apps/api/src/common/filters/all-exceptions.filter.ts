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

// Respuesta de error uniforme: { statusCode, error, message, path, timestamp }.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const esHttp = exception instanceof HttpException;
    const statusCode = esHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const cuerpo = esHttp ? exception.getResponse() : null;
    const detalle =
      typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};

    if (!esHttp) {
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
          : 'Error interno del servidor',
        path: httpAdapter.getRequestUrl(ctx.getRequest()) as string,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
