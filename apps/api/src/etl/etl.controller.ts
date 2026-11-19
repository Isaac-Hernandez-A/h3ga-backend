import {
  Controller,
  DefaultValuePipe,
  HttpCode,
  ParseBoolPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ArchivoSubido } from '../documentos/documentos.service';
import { SubirArchivoInterceptor } from '../documentos/subir-archivo.interceptor';
import { EtlService } from './etl.service';
import { ReporteEtl } from './tipos';

@ApiTags('etl')
@Controller()
export class EtlController {
  constructor(private readonly service: EtlService) {}

  // Importa el Excel de control operativo (hoja Clientes). Solo el Supervisor. El archivo llega en memoria
  // por el mismo mecanismo que los documentos (máximo 10 MB, 400 si se pasa). Responde el reporte de la
  // corrida con CURP y NSS enmascarados.
  @Post('etl/importaciones')
  @HttpCode(200)
  @Roles(...PERMISOS.etl.importar)
  @UseInterceptors(SubirArchivoInterceptor)
  @ApiOperation({
    summary: 'Importar clientes desde el Excel de control operativo',
    description:
      'Lee la hoja Clientes, sanea y valida cada renglón y carga los válidos por lotes. Con simulacro=true ejecuta todo sin guardar nada. Devuelve el reporte de la corrida.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'Libro de Excel (.xlsx), máximo 10 MB.',
        },
      },
    },
  })
  @ApiQuery({
    name: 'simulacro',
    required: false,
    type: Boolean,
    description: 'true: no guarda nada.',
  })
  @ApiOkResponse({ description: 'Reporte de la importación (JSON).' })
  @ApiBadRequestResponse({
    description:
      'Sin archivo, no es un .xlsx válido, pasa de 10 MB, falta la hoja Clientes o columnas obligatorias, o simulacro inválido.',
  })
  @ApiServiceUnavailableResponse({
    description:
      'Falta configurar las equivalencias de asesores (ETL_EQUIVALENCIAS) o son ilegibles.',
  })
  importar(
    @CurrentUser() usuario: AuthenticatedUser,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    // El tipo es string | boolean (no boolean) a propósito: con boolean, el ValidationPipe global convierte
    // cualquier texto que no sea "true" en false y un simulacro mal escrito haría una carga real.
    @Query('simulacro', new DefaultValuePipe(false), ParseBoolPipe) simulacro: string | boolean,
  ): Promise<ReporteEtl> {
    return this.service.importarSubido(archivo, {
      ejecutorId: usuario.sub,
      simulacro: simulacro === true,
    });
  }
}
