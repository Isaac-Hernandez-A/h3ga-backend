import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateAnalisisModalidad40RetroactivoDto } from './dto/create-analisis-modalidad40-retroactivo.dto';
import { CreateAnalisisRecuperacionSemanasDto } from './dto/create-analisis-recuperacion-semanas.dto';
import { CreateDiagnosticoEspecializadoDto } from './dto/create-diagnostico-especializado.dto';
import { CreateEscenarioPensionDto } from './dto/create-escenario-pension.dto';
import { CreatePeriodoInconsistenciaDto } from './dto/create-periodo-inconsistencia.dto';
import { CreatePlanAccionDto } from './dto/create-plan-accion.dto';
import { CreateSituacionPatrimonialDto } from './dto/create-situacion-patrimonial.dto';
import { CreateSituacionPatrimonialHijosDto } from './dto/create-situacion-patrimonial-hijos.dto';
import { UpdateDiagnosticoEspecializadoDto } from './dto/update-diagnostico-especializado.dto';
import { UpdateEscenarioPensionDto } from './dto/update-escenario-pension.dto';
import { UpdatePeriodoInconsistenciaDto } from './dto/update-periodo-inconsistencia.dto';
import { UpdatePlanAccionDto } from './dto/update-plan-accion.dto';
import { AnalisisModalidad40Retroactivo } from './entities/analisis-modalidad40-retroactivo.entity';
import { AnalisisRecuperacionSemanas } from './entities/analisis-recuperacion-semanas.entity';
import { DiagnosticoEspecializado } from './entities/diagnostico-especializado.entity';
import { EscenarioPension } from './entities/escenario-pension.entity';
import { EstrategiaRecomendadaTipo } from './entities/estrategia-recomendada-tipo.entity';
import { ObjetivoDiagnostico } from './entities/objetivo-diagnostico.entity';
import { ObjetivoModalidad10 } from './entities/objetivo-modalidad10.entity';
import { ObjetivoModalidad40 } from './entities/objetivo-modalidad40.entity';
import { PeriodoInconsistencia } from './entities/periodo-inconsistencia.entity';
import { PlanAccion } from './entities/plan-accion.entity';
import { SituacionPatrimonial } from './entities/situacion-patrimonial.entity';
import { SituacionPatrimonialHijos } from './entities/situacion-patrimonial-hijos.entity';
import { TipoEvidenciaRecuperacion } from './entities/tipo-evidencia-recuperacion.entity';
import { TipoGestionRecuperacion } from './entities/tipo-gestion-recuperacion.entity';
import { TipoInconsistenciaDetectada } from './entities/tipo-inconsistencia-detectada.entity';
import { DiagnosticosService } from './diagnosticos.service';

@ApiTags('diagnosticos')
@UseGuards(ClienteAccessGuard)
@Controller()
export class DiagnosticosController {
  constructor(private readonly service: DiagnosticosService) {}

  @Get('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Obtener el diagnóstico especializado' })
  @ApiOkResponse({ type: DiagnosticoEspecializado })
  obtenerDiagnostico(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<DiagnosticoEspecializado> {
    return this.service.obtenerDiagnostico(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Crear el diagnóstico especializado' })
  @ApiCreatedResponse({ type: DiagnosticoEspecializado })
  crearDiagnostico(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    return this.service.crearDiagnostico(clienteId, dto);
  }

  @Patch('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Actualizar el diagnóstico especializado' })
  @ApiOkResponse({ type: DiagnosticoEspecializado })
  actualizarDiagnostico(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: UpdateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    return this.service.actualizarDiagnostico(clienteId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/recuperacion-semanas')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Obtener el análisis de recuperación de semanas' })
  @ApiOkResponse({ type: AnalisisRecuperacionSemanas })
  obtenerRecuperacionSemanas(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<AnalisisRecuperacionSemanas> {
    return this.service.obtenerRecuperacionSemanas(clienteId);
  }

  @Put('clientes/:clienteId/diagnostico/recuperacion-semanas')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Crear o reemplazar el análisis de recuperación de semanas' })
  @ApiOkResponse({ type: AnalisisRecuperacionSemanas })
  guardarRecuperacionSemanas(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateAnalisisRecuperacionSemanasDto,
  ): Promise<AnalisisRecuperacionSemanas> {
    return this.service.guardarRecuperacionSemanas(clienteId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/modalidad-40-retroactivo')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Obtener el análisis de Modalidad 40 retroactiva' })
  @ApiOkResponse({ type: AnalisisModalidad40Retroactivo })
  obtenerModalidad40Retroactivo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<AnalisisModalidad40Retroactivo> {
    return this.service.obtenerModalidad40Retroactivo(clienteId);
  }

  @Put('clientes/:clienteId/diagnostico/modalidad-40-retroactivo')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Crear o reemplazar el análisis de Modalidad 40 retroactiva' })
  @ApiOkResponse({ type: AnalisisModalidad40Retroactivo })
  guardarModalidad40Retroactivo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateAnalisisModalidad40RetroactivoDto,
  ): Promise<AnalisisModalidad40Retroactivo> {
    return this.service.guardarModalidad40Retroactivo(clienteId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/escenarios')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Listar los escenarios de pensión' })
  @ApiOkResponse({ type: EscenarioPension, isArray: true })
  listarEscenarios(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<EscenarioPension[]> {
    return this.service.listarEscenarios(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico/escenarios')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Agregar un escenario de pensión' })
  @ApiCreatedResponse({ type: EscenarioPension })
  crearEscenario(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    return this.service.crearEscenario(clienteId, dto);
  }

  @Patch('clientes/:clienteId/diagnostico/escenarios/:escenarioId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Actualizar un escenario de pensión' })
  @ApiOkResponse({ type: EscenarioPension })
  actualizarEscenario(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('escenarioId', ParseUUIDPipe) escenarioId: string,
    @Body() dto: UpdateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    return this.service.actualizarEscenario(clienteId, escenarioId, dto);
  }

  @Get('clientes/:clienteId/periodos-inconsistencias')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Listar los periodos con inconsistencias' })
  @ApiOkResponse({ type: PeriodoInconsistencia, isArray: true })
  listarPeriodosInconsistencias(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<PeriodoInconsistencia[]> {
    return this.service.listarPeriodosInconsistencias(clienteId);
  }

  @Post('clientes/:clienteId/periodos-inconsistencias')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Agregar un periodo con inconsistencia' })
  @ApiCreatedResponse({ type: PeriodoInconsistencia })
  crearPeriodoInconsistencia(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    return this.service.crearPeriodoInconsistencia(clienteId, dto);
  }

  @Patch('clientes/:clienteId/periodos-inconsistencias/:periodoId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Actualizar un periodo con inconsistencia' })
  @ApiOkResponse({ type: PeriodoInconsistencia })
  actualizarPeriodoInconsistencia(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('periodoId', ParseUUIDPipe) periodoId: string,
    @Body() dto: UpdatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    return this.service.actualizarPeriodoInconsistencia(clienteId, periodoId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/plan-accion')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Listar el plan de acción' })
  @ApiOkResponse({ type: PlanAccion, isArray: true })
  listarPlanAccion(@Param('clienteId', ParseUUIDPipe) clienteId: string): Promise<PlanAccion[]> {
    return this.service.listarPlanAccion(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico/plan-accion')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Agregar una acción al plan' })
  @ApiCreatedResponse({ type: PlanAccion })
  crearPlanAccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreatePlanAccionDto,
  ): Promise<PlanAccion> {
    return this.service.crearPlanAccion(clienteId, dto);
  }

  @Patch('clientes/:clienteId/diagnostico/plan-accion/:planAccionId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Actualizar una acción del plan' })
  @ApiOkResponse({ type: PlanAccion })
  actualizarPlanAccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('planAccionId', ParseUUIDPipe) planAccionId: string,
    @Body() dto: UpdatePlanAccionDto,
  ): Promise<PlanAccion> {
    return this.service.actualizarPlanAccion(clienteId, planAccionId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/situacion-patrimonial')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Obtener la situación patrimonial' })
  @ApiOkResponse({ type: SituacionPatrimonial })
  obtenerSituacionPatrimonial(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<SituacionPatrimonial> {
    return this.service.obtenerSituacionPatrimonial(clienteId);
  }

  @Put('clientes/:clienteId/diagnostico/situacion-patrimonial')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Crear o reemplazar la situación patrimonial' })
  @ApiOkResponse({ type: SituacionPatrimonial })
  guardarSituacionPatrimonial(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateSituacionPatrimonialDto,
  ): Promise<SituacionPatrimonial> {
    return this.service.guardarSituacionPatrimonial(clienteId, dto);
  }

  @Get('clientes/:clienteId/diagnostico/situacion-patrimonial/hijos')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({ summary: 'Listar los hijos de la situación patrimonial' })
  @ApiOkResponse({ type: SituacionPatrimonialHijos, isArray: true })
  listarHijos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<SituacionPatrimonialHijos[]> {
    return this.service.listarHijos(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico/situacion-patrimonial/hijos')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Agregar un hijo a la situación patrimonial' })
  @ApiCreatedResponse({ type: SituacionPatrimonialHijos })
  agregarHijo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateSituacionPatrimonialHijosDto,
  ): Promise<SituacionPatrimonialHijos> {
    return this.service.agregarHijo(clienteId, dto);
  }

  @Get('catalogos/estrategias-recomendadas')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar estrategias recomendadas' })
  @ApiOkResponse({ type: EstrategiaRecomendadaTipo, isArray: true })
  listarEstrategias(): Promise<EstrategiaRecomendadaTipo[]> {
    return this.service.listarEstrategias();
  }

  @Get('catalogos/objetivos-diagnostico')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar objetivos del diagnóstico' })
  @ApiOkResponse({ type: ObjetivoDiagnostico, isArray: true })
  listarObjetivosDiagnostico(): Promise<ObjetivoDiagnostico[]> {
    return this.service.listarObjetivosDiagnostico();
  }

  @Get('catalogos/tipos-inconsistencia')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de inconsistencia detectada' })
  @ApiOkResponse({ type: TipoInconsistenciaDetectada, isArray: true })
  listarTiposInconsistencia(): Promise<TipoInconsistenciaDetectada[]> {
    return this.service.listarTiposInconsistencia();
  }

  @Get('catalogos/tipos-gestion-recuperacion')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de gestión de recuperación' })
  @ApiOkResponse({ type: TipoGestionRecuperacion, isArray: true })
  listarTiposGestionRecuperacion(): Promise<TipoGestionRecuperacion[]> {
    return this.service.listarTiposGestionRecuperacion();
  }

  @Get('catalogos/tipos-evidencia-recuperacion')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de evidencia de recuperación' })
  @ApiOkResponse({ type: TipoEvidenciaRecuperacion, isArray: true })
  listarTiposEvidenciaRecuperacion(): Promise<TipoEvidenciaRecuperacion[]> {
    return this.service.listarTiposEvidenciaRecuperacion();
  }

  @Get('catalogos/objetivos-modalidad-10')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar objetivos de Modalidad 10' })
  @ApiOkResponse({ type: ObjetivoModalidad10, isArray: true })
  listarObjetivosModalidad10(): Promise<ObjetivoModalidad10[]> {
    return this.service.listarObjetivosModalidad10();
  }

  @Get('catalogos/objetivos-modalidad-40')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar objetivos de Modalidad 40' })
  @ApiOkResponse({ type: ObjetivoModalidad40, isArray: true })
  listarObjetivosModalidad40(): Promise<ObjetivoModalidad40[]> {
    return this.service.listarObjetivosModalidad40();
  }
}
