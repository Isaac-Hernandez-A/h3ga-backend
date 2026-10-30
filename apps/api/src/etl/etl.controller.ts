import { Body, Controller, Post } from '@nestjs/common';
import { ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ImportarExcelDto } from './dto/importar-excel.dto';
import { EtlService } from './etl.service';

@ApiTags('etl')
@Controller()
export class EtlController {
  constructor(private readonly service: EtlService) {}

  @Post('etl/importaciones')
  @Roles(...PERMISOS.etl.importar)
  @ApiOperation({ summary: 'Importar un archivo Excel (esbozo)' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'Esbozo: el resultado de la importación se define en la etapa de ETL.',
  })
  importarExcel(@Body() dto: ImportarExcelDto): Promise<unknown> {
    return this.service.importarExcel(dto);
  }
}
