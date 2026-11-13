import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto, LIMITE_POR_OMISION } from './dto/dashboard-query.dto';
import { DashboardRespuesta } from './dto/dashboard-respuesta.dto';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('dashboard')
  @Roles(...PERMISOS.dashboard.leer)
  @ApiOperation({
    summary: 'Resumen del Dashboard de Inicio, ya calculado y con el alcance del usuario',
    description:
      'Asesor: sus clientes; auxiliar: los clientes con autorización activa; supervisor: todos. ' +
      'Las reglas (cliente activo, etapa actual, avance detenido, acciones del mes) están en docs/arquitectura.md. ' +
      'La fecha de hoy y el mes salen de la hora del servidor en America/Cancun.',
  })
  @ApiOkResponse({ type: DashboardRespuesta })
  @ApiBadRequestResponse({ description: 'limite no es un entero entre 1 y 50.' })
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido.' })
  @ApiForbiddenResponse({ description: 'El rol no puede consultar el dashboard.' })
  obtener(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: DashboardQueryDto,
  ): Promise<DashboardRespuesta> {
    return this.service.obtener(usuario, consulta.limite ?? LIMITE_POR_OMISION);
  }
}
