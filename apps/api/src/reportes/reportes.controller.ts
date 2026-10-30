import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ConsultaReporteDto } from './dto/consulta-reporte.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@Controller()
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('reportes')
  @Roles(...PERMISOS.reportes.leer)
  @ApiOperation({ summary: 'Consultar un reporte (esbozo)' })
  @ApiOkResponse({
    description: 'Esbozo: el formato del reporte se define en la etapa de reportes.',
  })
  consultarReporte(@Query() consulta: ConsultaReporteDto): Promise<unknown> {
    return this.service.consultarReporte(consulta);
  }
}
