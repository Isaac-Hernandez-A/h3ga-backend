import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Publico } from '../common/auth/publico.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly ds: DataSource) {}

  // Solo dice que el proceso vive: no toca la base (sirve de liveness).
  @Get()
  @Publico()
  @ApiOperation({ summary: 'Estado del servicio' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  // Además consulta la base (SELECT 1): sirve de health check de despliegue. Si falla responde 503 con un
  // mensaje genérico; el error de la base (que puede citar usuarios o servidores) solo queda fuera.
  @Get('db')
  @Publico()
  @ApiOperation({ summary: 'Estado del servicio y de la conexión a la base de datos' })
  @ApiOkResponse({ schema: { example: { status: 'ok', base_de_datos: 'ok' } } })
  @ApiServiceUnavailableResponse({ description: 'La API no pudo consultar la base de datos.' })
  async checkBd(): Promise<{ status: 'ok'; base_de_datos: 'ok' }> {
    try {
      await this.ds.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar la base de datos.');
    }
    return { status: 'ok', base_de_datos: 'ok' };
  }
}
