import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { F1PdfService } from '../reportes/pdf/f1-pdf.service';
import { AvanceF1Interceptor } from './avance-f1.interceptor';
import { ReemplazarListaDto } from './dto/reemplazar-lista.dto';
import { LISTAS_F1 } from './listas-f1';
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
import { TipoDocumentoDiagnostico } from './entities/tipo-documento-diagnostico.entity';
import { TipoEvidenciaRecuperacion } from './entities/tipo-evidencia-recuperacion.entity';
import { TipoGestionRecuperacion } from './entities/tipo-gestion-recuperacion.entity';
import { TipoInconsistenciaDetectada } from './entities/tipo-inconsistencia-detectada.entity';
import { DiagnosticosService } from './diagnosticos.service';

@ApiTags('diagnosticos')
@UseGuards(ClienteAccessGuard)
@UseInterceptors(AvanceF1Interceptor)
@Controller()
export class DiagnosticosController {
  constructor(
    private readonly service: DiagnosticosService,
    private readonly pdf: F1PdfService,
  ) {}

  @Get('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Obtener el diagnóstico especializado',
    description: 'Sin diagnóstico todavía responde 200 con el cuerpo vacío (se crea con POST).',
  })
  @ApiOkResponse({ type: DiagnosticoEspecializado })
  obtenerDiagnostico(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<DiagnosticoEspecializado | null> {
    return this.service.obtenerDiagnostico(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Crear el borrador del diagnóstico especializado',
    description:
      'Todos los campos son opcionales (el F1 se guarda por pasos). asesor_id es el asesor del cliente y ' +
      'fecha_analisis es hoy (America/Cancun) si no se envía. Un segundo POST responde 409.',
  })
  @ApiCreatedResponse({ type: DiagnosticoEspecializado })
  crearDiagnostico(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    return this.service.crearDiagnostico(clienteId, dto);
  }

  @Patch('clientes/:clienteId/diagnostico')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Actualizar el diagnóstico especializado',
    description:
      'Actualización parcial: lo omitido se conserva y null borra el campo. Sin diagnóstico, 404.',
  })
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
  ): Promise<AnalisisRecuperacionSemanas | null> {
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
  ): Promise<AnalisisModalidad40Retroactivo | null> {
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
  ): Promise<SituacionPatrimonial | null> {
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
  ): Promise<Record<string, unknown>[]> {
    return this.service.listarHijos(clienteId);
  }

  @Post('clientes/:clienteId/diagnostico/situacion-patrimonial/hijos')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({ summary: 'Agregar un hijo a la situación patrimonial' })
  @ApiCreatedResponse({ type: SituacionPatrimonialHijos })
  agregarHijo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateSituacionPatrimonialHijosDto,
  ): Promise<Record<string, unknown>> {
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

  @Get('catalogos/documentos-diagnostico')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar los documentos requeridos del F1 (sección 2)' })
  @ApiOkResponse({ type: TipoDocumentoDiagnostico, isArray: true })
  listarTiposDocumentoDiagnostico(): Promise<TipoDocumentoDiagnostico[]> {
    return this.service.listarTiposDocumentoDiagnostico();
  }

  @Get('clientes/:clienteId/diagnostico/objetivos')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar objetivos del cliente (sección 1)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerObjetivos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'objetivos');
  }

  @Put('clientes/:clienteId/diagnostico/objetivos')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar objetivos del cliente (sección 1)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['objetivos'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarObjetivos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'objetivos', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/estrategias-recomendadas')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar estrategias recomendadas (sección 12)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerEstrategiasRecomendadas(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'estrategias-recomendadas');
  }

  @Put('clientes/:clienteId/diagnostico/estrategias-recomendadas')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar estrategias recomendadas (sección 12)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['estrategias-recomendadas'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarEstrategiasRecomendadas(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'estrategias-recomendadas', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/inconsistencias-generales')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar revisión de inconsistencias (sección 4)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerInconsistenciasGenerales(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'inconsistencias-generales');
  }

  @Put('clientes/:clienteId/diagnostico/inconsistencias-generales')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar revisión de inconsistencias (sección 4)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['inconsistencias-generales'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarInconsistenciasGenerales(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'inconsistencias-generales', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/objetivos-modalidad-10')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar objetivos de Modalidad 10 (sección 7)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerObjetivosModalidad10(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'objetivos-modalidad-10');
  }

  @Put('clientes/:clienteId/diagnostico/objetivos-modalidad-10')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar objetivos de Modalidad 10 (sección 7)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['objetivos-modalidad-10'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarObjetivosModalidad10(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'objetivos-modalidad-10', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/objetivos-modalidad-40')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar objetivos de Modalidad 40 (sección 8)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerObjetivosModalidad40(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'objetivos-modalidad-40');
  }

  @Put('clientes/:clienteId/diagnostico/objetivos-modalidad-40')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar objetivos de Modalidad 40 (sección 8)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['objetivos-modalidad-40'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarObjetivosModalidad40(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'objetivos-modalidad-40', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/recuperacion-gestiones')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar tipos de gestión de recuperación (sección 5)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerRecuperacionGestiones(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'recuperacion-gestiones');
  }

  @Put('clientes/:clienteId/diagnostico/recuperacion-gestiones')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar tipos de gestión de recuperación (sección 5)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['recuperacion-gestiones'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarRecuperacionGestiones(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'recuperacion-gestiones', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/recuperacion-evidencias')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar evidencia mínima de recuperación (sección 5)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerRecuperacionEvidencias(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'recuperacion-evidencias');
  }

  @Put('clientes/:clienteId/diagnostico/recuperacion-evidencias')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar evidencia mínima de recuperación (sección 5)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['recuperacion-evidencias'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarRecuperacionEvidencias(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'recuperacion-evidencias', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/documentos')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar documentos requeridos (sección 2)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerDocumentos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'documentos');
  }

  @Put('clientes/:clienteId/diagnostico/documentos')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar documentos requeridos (sección 2)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['documentos'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarDocumentos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'documentos', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/criterios-modalidad-10')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar criterios de aplicabilidad de Modalidad 10 (sección 7)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerCriteriosModalidad10(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'criterios-modalidad-10');
  }

  @Put('clientes/:clienteId/diagnostico/criterios-modalidad-10')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar criterios de aplicabilidad de Modalidad 10 (sección 7)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['criterios-modalidad-10'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarCriteriosModalidad10(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'criterios-modalidad-10', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/criterios-modalidad-40')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar requisitos y restricciones de Modalidad 40 (sección 8)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerCriteriosModalidad40(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'criterios-modalidad-40');
  }

  @Put('clientes/:clienteId/diagnostico/criterios-modalidad-40')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar requisitos y restricciones de Modalidad 40 (sección 8)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['criterios-modalidad-40'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarCriteriosModalidad40(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'criterios-modalidad-40', dto.items);
  }

  @Get('clientes/:clienteId/diagnostico/conveniencia-retroactivo')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Listar evaluación de conveniencia del retroactivo (sección 9)',
    description: 'Sin el diagnóstico (o el análisis del que cuelga) todavía responde [].',
  })
  @ApiOkResponse({ description: 'La lista guardada, en el orden del catálogo o de captura.' })
  leerConvenienciaRetroactivo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.leerLista(clienteId, 'conveniencia-retroactivo');
  }

  @Put('clientes/:clienteId/diagnostico/conveniencia-retroactivo')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar evaluación de conveniencia del retroactivo (sección 9)',
    description:
      'Cuerpo: { items: [elemento] } con la lista COMPLETA (lo que no venga se borra; [] la vacía). ' +
      'Elemento: ' +
      LISTAS_F1['conveniencia-retroactivo'].descripcionItem +
      '. Sin el dueño de la lista responde 409 diciendo qué falta crear.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarConvenienciaRetroactivo(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'conveniencia-retroactivo', dto.items);
  }

  @Put('clientes/:clienteId/diagnostico/situacion-patrimonial/hijos')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @ApiOperation({
    summary: 'Reemplazar la lista de hijos (una fila por hijo)',
    description:
      'Cuerpo: { items: [{ edad: entero de 0 a 120, tiene_discapacidad?: boolean }] } con la lista COMPLETA. ' +
      'El número de hijos es el número de filas. Sin situación patrimonial responde 409.',
  })
  @ApiOkResponse({ description: 'La lista guardada.' })
  guardarHijos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarListaDto,
  ): Promise<Record<string, unknown>[]> {
    return this.service.reemplazarLista(clienteId, 'hijos', dto.items);
  }

  @Delete('clientes/:clienteId/diagnostico/escenarios/:escenarioId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar un escenario de pensión',
    description: 'Libera su orden (1 a 3) para crear otro. 404 si no existe o es de otro cliente.',
  })
  @ApiNoContentResponse({ description: 'Escenario eliminado.' })
  eliminarEscenario(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('escenarioId', ParseUUIDPipe) escenarioId: string,
  ): Promise<void> {
    return this.service.eliminarEscenario(clienteId, escenarioId);
  }

  @Delete('clientes/:clienteId/diagnostico/plan-accion/:planAccionId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una acción del plan' })
  @ApiNoContentResponse({ description: 'Acción eliminada.' })
  eliminarPlanAccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('planAccionId', ParseUUIDPipe) planAccionId: string,
  ): Promise<void> {
    return this.service.eliminarPlanAccion(clienteId, planAccionId);
  }

  @Delete('clientes/:clienteId/periodos-inconsistencias/:periodoId')
  @Roles(...PERMISOS.diagnosticos.escribir)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un periodo de inconsistencia' })
  @ApiNoContentResponse({ description: 'Periodo eliminado.' })
  eliminarPeriodoInconsistencia(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('periodoId', ParseUUIDPipe) periodoId: string,
  ): Promise<void> {
    return this.service.eliminarPeriodoInconsistencia(clienteId, periodoId);
  }

  @Get('clientes/:clienteId/diagnostico/pdf')
  @Roles(...PERMISOS.diagnosticos.leer)
  @ApiOperation({
    summary: 'Descargar el formato F1 en PDF',
    description:
      'El formato oficial de 14 secciones con aviso de alcance y líneas de firma. Si el diagnóstico no está ' +
      'completo responde 409 con { message, faltantes: [{ seccion, campo, etiqueta }] }; sin diagnóstico, 409.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'El PDF del F1.' })
  async descargarPdf(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<StreamableFile> {
    const { pdf, nombreArchivo } = await this.pdf.generar(clienteId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombreArchivo}"`,
      length: pdf.length,
    });
  }
}
