import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ConsultaReporteDto } from './dto/consulta-reporte.dto';
import { ReporteOperativo } from './reporte-operativo';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@Controller()
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('reportes')
  @Roles(...PERMISOS.reportes.leer)
  @ApiOperation({
    summary: 'Reporte operativo semanal o mensual (etapas 0 a 4)',
    description:
      'Cartera por etapa y estatus, trámites finalizados, vencidos y por vencer, tasa de rechazo, clientes ' +
      'nuevos por régimen y, solo para el supervisor, el avance por asesor. El asesor ve sus clientes; el ' +
      'supervisor, todos.',
  })
  @ApiOkResponse({ type: ReporteOperativo })
  generar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ConsultaReporteDto,
  ): Promise<ReporteOperativo> {
    return this.service.generar(usuario, consulta);
  }
}
