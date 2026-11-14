import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { DiagnosticosService } from './diagnosticos.service';

// Después de cada escritura exitosa del F1 (POST, PUT, PATCH o DELETE bajo un cliente) recalcula el avance de
// la etapa 1. Los GET no lo tocan. Un fallo del cálculo no debe tumbar un guardado que ya se hizo: se registra.
@Injectable()
export class AvanceF1Interceptor implements NestInterceptor {
  private readonly log = new Logger(AvanceF1Interceptor.name);

  constructor(private readonly service: DiagnosticosService) {}

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const peticion = contexto.switchToHttp().getRequest<{
      method: string;
      params: { clienteId?: string };
    }>();
    return siguiente.handle().pipe(
      mergeMap(async (respuesta: unknown) => {
        const { clienteId } = peticion.params;
        if (peticion.method !== 'GET' && clienteId) {
          try {
            await this.service.actualizarAvance(clienteId);
          } catch (error) {
            this.log.warn(
              `No se pudo actualizar el avance de la etapa 1: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        return respuesta;
      }),
    );
  }
}
