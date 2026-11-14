import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ConsultaReporteDto } from './dto/consulta-reporte.dto';
import { ReportePdfService } from './pdf/reporte-pdf.service';
import { ReporteOperativo } from './reporte-operativo';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@Controller()
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly pdf: ReportePdfService,
  ) {}

  @Get('reportes')
  @Roles(...PERMISOS.reportes.leer)
  @ApiOperation({
    summary: 'Reporte operativo semanal, mensual o trimestral (etapas 0 a 4)',
    description:
      'Cartera por etapa y estatus, trámites finalizados, vencidos y por vencer, tasa de rechazo, clientes ' +
      'nuevos por régimen, la trazabilidad de etapas (cambios de estatus del periodo: total y los 20 más ' +
      'recientes) y, solo para el supervisor, el avance por asesor. `periodo` puede ser semanal, mensual o ' +
      'trimestral (trimestre de calendario). El asesor ve sus clientes; el supervisor, todos.',
  })
  @ApiOkResponse({ type: ReporteOperativo })
  generar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ConsultaReporteDto,
  ): Promise<ReporteOperativo> {
    return this.service.generar(usuario, consulta);
  }

  @Get('reportes/pdf')
  @Roles(...PERMISOS.reportes.leer)
  @ApiOperation({
    summary: 'Reporte operativo semanal, mensual o trimestral en PDF',
    description:
      'Mismos parámetros, alcance y números que GET /reportes, con el diseño corporativo del formato F0.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'El PDF del reporte.' })
  async generarPdf(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ConsultaReporteDto,
  ): Promise<StreamableFile> {
    const reporte = await this.service.generar(usuario, consulta);
    const archivo = await this.pdf.generar(reporte);
    return new StreamableFile(archivo, {
      type: 'application/pdf',
      disposition: `attachment; filename="Reporte-operativo-${reporte.periodo}-${reporte.desde}.pdf"`,
      length: archivo.length,
    });
  }
}
