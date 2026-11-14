import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { traducirErrorBd } from '../common/database/errores-postgres';
import { fechaLocal } from '../common/fechas';
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
import { Dueno, LISTAS_F1, DefLista, validarElementos } from './listas-f1';
import { TipoDocumentoDiagnostico } from './entities/tipo-documento-diagnostico.entity';
import { TipoEvidenciaRecuperacion } from './entities/tipo-evidencia-recuperacion.entity';
import { TipoGestionRecuperacion } from './entities/tipo-gestion-recuperacion.entity';
import { TipoInconsistenciaDetectada } from './entities/tipo-inconsistencia-detectada.entity';

const MENSAJE_SIN_DIAGNOSTICO = 'Primero crea el diagnóstico especializado (F1).';
const MENSAJES_TEXTO = { dato: 'Algún texto o valor enviado no es válido.' };
const MENSAJES_ESCENARIO = {
  unica: 'Ya existe un escenario con ese orden.',
  dato: 'Algún texto o valor enviado no es válido.',
};

const MENSAJE_SIN_DUENO: Record<Dueno, string> = {
  patrimonial: 'Primero registra la situación patrimonial.',
  diagnostico: MENSAJE_SIN_DIAGNOSTICO,
  recuperacion: 'Primero registra el análisis de recuperación de semanas.',
  retroactivo: 'Primero registra el análisis de Modalidad 40 con pago retroactivo.',
};

// Solo los campos enviados: lo omitido (undefined) no se toca; null sí borra el campo.
function conservarDefinidos<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, valor]) => valor !== undefined),
  ) as Partial<T>;
}

@Injectable()
export class DiagnosticosService {
  constructor(private readonly ds: DataSource) {}

  // Un cliente sin diagnóstico todavía responde vacío (null); se crea con POST.
  obtenerDiagnostico(clienteId: string): Promise<DiagnosticoEspecializado | null> {
    return this.ds.getRepository(DiagnosticoEspecializado).findOneBy({ cliente_id: clienteId });
  }

  // Crea el borrador: asesor_id es el asesor del cliente y fecha_analisis, hoy en America/Cancun.
  async crearDiagnostico(
    clienteId: string,
    dto: CreateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    const cliente = await this.ds.getRepository(Cliente).findOneBy({ id: clienteId });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    const repo = this.ds.getRepository(DiagnosticoEspecializado);
    try {
      const valores = {
        ...conservarDefinidos(dto),
        cliente_id: clienteId,
        asesor_id: cliente.asesor_id,
        fecha_analisis: dto.fecha_analisis ?? fechaLocal(new Date()),
      } as DeepPartial<DiagnosticoEspecializado>;
      const creado = await repo.save(repo.create(valores));
      return await repo.findOneByOrFail({ id: creado.id });
    } catch (error) {
      return traducirErrorBd(error, {
        unica: 'El cliente ya tiene diagnóstico especializado (F1).',
        dato: 'Algún texto o valor enviado no es válido.',
      });
    }
  }

  async actualizarDiagnostico(
    clienteId: string,
    dto: UpdateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    const repo = this.ds.getRepository(DiagnosticoEspecializado);
    const actual = await repo.findOneBy({ cliente_id: clienteId });
    if (!actual) throw new NotFoundException('Diagnóstico especializado no encontrado.');
    const cambios = conservarDefinidos(dto);
    try {
      // Con {} no hay nada que cambiar: tampoco se toca actualizado_en.
      if (Object.keys(cambios).length > 0) {
        await repo.update({ id: actual.id }, { ...cambios, actualizado_en: new Date() } as never);
      }
    } catch (error) {
      traducirErrorBd(error, { dato: 'Algún texto o valor enviado no es válido.' });
    }
    return repo.findOneByOrFail({ id: actual.id });
  }

  // Sin análisis todavía responde vacío (null).
  obtenerRecuperacionSemanas(clienteId: string): Promise<AnalisisRecuperacionSemanas | null> {
    return this.ds
      .getRepository(AnalisisRecuperacionSemanas)
      .createQueryBuilder('a')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = a.diagnostico_id')
      .where('d.cliente_id = :clienteId', { clienteId })
      .getOne();
  }

  // F4 (D3): guarda el dictamen (PUT idempotente, 1:1 con el diagnóstico F1) y, si trae las semanas
  // reconocidas, actualiza clientes.semanas_imss_reconocidas en la MISMA transacción. Nunca modifica
  // semanas_a_recuperar. Requiere que el cliente ya tenga su diagnóstico especializado.
  async guardarRecuperacionSemanas(
    clienteId: string,
    dto: CreateAnalisisRecuperacionSemanasDto,
  ): Promise<AnalisisRecuperacionSemanas> {
    return this.ds.transaction(async (manager) => {
      const diagnostico = await manager.findOneBy(DiagnosticoEspecializado, {
        cliente_id: clienteId,
      });
      if (!diagnostico) {
        throw new ConflictException('El cliente aún no tiene diagnóstico especializado (F1).');
      }
      await manager.upsert(
        AnalisisRecuperacionSemanas,
        {
          diagnostico_id: diagnostico.id,
          aplica: dto.aplica,
          observaciones: dto.observaciones ?? null,
        },
        ['diagnostico_id'],
      );
      if (dto.semanas_imss_reconocidas !== undefined) {
        await manager.update(
          Cliente,
          { id: clienteId },
          { semanas_imss_reconocidas: dto.semanas_imss_reconocidas },
        );
      }
      return manager.findOneByOrFail(AnalisisRecuperacionSemanas, {
        diagnostico_id: diagnostico.id,
      });
    });
  }

  // Sin análisis todavía responde vacío (null).
  async obtenerModalidad40Retroactivo(
    clienteId: string,
  ): Promise<AnalisisModalidad40Retroactivo | null> {
    return this.ds
      .getRepository(AnalisisModalidad40Retroactivo)
      .createQueryBuilder('a')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = a.diagnostico_id')
      .where('d.cliente_id = :clienteId', { clienteId })
      .getOne();
  }

  // PUT: crea o reemplaza el análisis (1:1 con el diagnóstico). Todo es opcional: lo no enviado queda vacío.
  async guardarModalidad40Retroactivo(
    clienteId: string,
    dto: CreateAnalisisModalidad40RetroactivoDto,
  ): Promise<AnalisisModalidad40Retroactivo> {
    const diagnostico = await this.diagnosticoDe(clienteId);
    const repo = this.ds.getRepository(AnalisisModalidad40Retroactivo);
    const campos = [
      'fecha_propuesta_inicio_m40',
      'fecha_solicitud',
      'meses_retroactivos_estimados',
      'salario_diario_propuesto',
      'cuotas_estimadas',
      'recargos_actualizaciones_estimadas',
      'total_estimado_pagar',
      'baja_por_mora_previa',
      'dentro_de_plazo_reingreso',
      'conclusion_retroactivo',
      'comentarios',
    ] as const;
    const valores = Object.fromEntries(campos.map((c) => [c, dto[c] ?? null]));
    try {
      await repo.upsert({ ...valores, diagnostico_id: diagnostico.id } as never, [
        'diagnostico_id',
      ]);
    } catch (error) {
      traducirErrorBd(error, { dato: 'Algún texto o valor enviado no es válido.' });
    }
    return repo.findOneByOrFail({ diagnostico_id: diagnostico.id });
  }

  // ---------- Escenarios (máximo 3, con orden 1 a 3 sin repetirse) ----------

  async listarEscenarios(clienteId: string): Promise<EscenarioPension[]> {
    return this.ds
      .getRepository(EscenarioPension)
      .createQueryBuilder('e')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = e.diagnostico_f1_id')
      .where('d.cliente_id = :clienteId', { clienteId })
      .orderBy('e.orden', 'ASC')
      .getMany();
  }

  async crearEscenario(
    clienteId: string,
    dto: CreateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    const diagnostico = await this.diagnosticoDe(clienteId);
    const repo = this.ds.getRepository(EscenarioPension);
    try {
      const valores = { ...conservarDefinidos(dto), diagnostico_f1_id: diagnostico.id };
      const creado = await repo.save(repo.create(valores as DeepPartial<EscenarioPension>));
      return await repo.findOneByOrFail({ id: creado.id });
    } catch (error) {
      return traducirErrorBd(error, MENSAJES_ESCENARIO);
    }
  }

  async actualizarEscenario(
    clienteId: string,
    escenarioId: string,
    dto: UpdateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    const repo = this.ds.getRepository(EscenarioPension);
    const actual = await repo
      .createQueryBuilder('e')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = e.diagnostico_f1_id')
      .where('e.id = :escenarioId AND d.cliente_id = :clienteId', { escenarioId, clienteId })
      .getOne();
    if (!actual) throw new NotFoundException('Escenario no encontrado.');
    const cambios = conservarDefinidos(dto);
    try {
      if (Object.keys(cambios).length > 0) await repo.update({ id: actual.id }, cambios as never);
    } catch (error) {
      traducirErrorBd(error, MENSAJES_ESCENARIO);
    }
    return repo.findOneByOrFail({ id: actual.id });
  }

  async eliminarEscenario(clienteId: string, escenarioId: string): Promise<void> {
    const repo = this.ds.getRepository(EscenarioPension);
    const actual = await repo
      .createQueryBuilder('e')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = e.diagnostico_f1_id')
      .where('e.id = :escenarioId AND d.cliente_id = :clienteId', { escenarioId, clienteId })
      .getOne();
    if (!actual) throw new NotFoundException('Escenario no encontrado.');
    await repo.delete({ id: actual.id });
  }

  // ---------- Periodos de inconsistencias (cuelgan del cliente) ----------

  listarPeriodosInconsistencias(clienteId: string): Promise<PeriodoInconsistencia[]> {
    return this.ds.query<PeriodoInconsistencia[]>(
      'SELECT * FROM periodos_inconsistencias WHERE cliente_id = $1 ORDER BY ctid',
      [clienteId],
    );
  }

  async crearPeriodoInconsistencia(
    clienteId: string,
    dto: CreatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    const repo = this.ds.getRepository(PeriodoInconsistencia);
    try {
      const valores = { ...conservarDefinidos(dto), cliente_id: clienteId };
      const creado = await repo.save(repo.create(valores as DeepPartial<PeriodoInconsistencia>));
      return await repo.findOneByOrFail({ id: creado.id });
    } catch (error) {
      return traducirErrorBd(error, MENSAJES_TEXTO);
    }
  }

  async actualizarPeriodoInconsistencia(
    clienteId: string,
    periodoId: string,
    dto: UpdatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    const repo = this.ds.getRepository(PeriodoInconsistencia);
    const actual = await repo.findOneBy({ id: periodoId, cliente_id: clienteId });
    if (!actual) throw new NotFoundException('Periodo no encontrado.');
    const cambios = conservarDefinidos(dto);
    try {
      if (Object.keys(cambios).length > 0) await repo.update({ id: actual.id }, cambios as never);
    } catch (error) {
      traducirErrorBd(error, MENSAJES_TEXTO);
    }
    return repo.findOneByOrFail({ id: actual.id });
  }

  async eliminarPeriodoInconsistencia(clienteId: string, periodoId: string): Promise<void> {
    const { affected } = await this.ds
      .getRepository(PeriodoInconsistencia)
      .delete({ id: periodoId, cliente_id: clienteId });
    if (!affected) throw new NotFoundException('Periodo no encontrado.');
  }

  // ---------- Plan de acción ----------

  listarPlanAccion(clienteId: string): Promise<PlanAccion[]> {
    return this.ds.query<PlanAccion[]>(
      `SELECT p.* FROM plan_accion p JOIN diagnostico_especializado d ON d.id = p.diagnostico_id
        WHERE d.cliente_id = $1 ORDER BY p.ctid`,
      [clienteId],
    );
  }

  async crearPlanAccion(clienteId: string, dto: CreatePlanAccionDto): Promise<PlanAccion> {
    const diagnostico = await this.diagnosticoDe(clienteId);
    const repo = this.ds.getRepository(PlanAccion);
    try {
      const valores = {
        ...conservarDefinidos(dto),
        estatus: dto.estatus ?? 'pendiente',
        diagnostico_id: diagnostico.id,
      };
      const creado = await repo.save(repo.create(valores as DeepPartial<PlanAccion>));
      return await repo.findOneByOrFail({ id: creado.id });
    } catch (error) {
      return traducirErrorBd(error, MENSAJES_TEXTO);
    }
  }

  private async planDelCliente(clienteId: string, planAccionId: string): Promise<PlanAccion> {
    const plan = await this.ds
      .getRepository(PlanAccion)
      .createQueryBuilder('p')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = p.diagnostico_id')
      .where('p.id = :planAccionId AND d.cliente_id = :clienteId', { planAccionId, clienteId })
      .getOne();
    if (!plan) throw new NotFoundException('Acción del plan no encontrada.');
    return plan;
  }

  async actualizarPlanAccion(
    clienteId: string,
    planAccionId: string,
    dto: UpdatePlanAccionDto,
  ): Promise<PlanAccion> {
    const actual = await this.planDelCliente(clienteId, planAccionId);
    const repo = this.ds.getRepository(PlanAccion);
    const cambios = conservarDefinidos(dto);
    try {
      if (Object.keys(cambios).length > 0) await repo.update({ id: actual.id }, cambios as never);
    } catch (error) {
      traducirErrorBd(error, MENSAJES_TEXTO);
    }
    return repo.findOneByOrFail({ id: actual.id });
  }

  async eliminarPlanAccion(clienteId: string, planAccionId: string): Promise<void> {
    const plan = await this.planDelCliente(clienteId, planAccionId);
    await this.ds.getRepository(PlanAccion).delete({ id: plan.id });
  }

  // ---------- Situación patrimonial y sus hijos (una fila por hijo) ----------

  // Sin registro todavía responde vacío (null).
  obtenerSituacionPatrimonial(clienteId: string): Promise<SituacionPatrimonial | null> {
    return this.ds
      .getRepository(SituacionPatrimonial)
      .createQueryBuilder('s')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = s.diagnostico_f1_id')
      .where('d.cliente_id = :clienteId', { clienteId })
      .getOne();
  }

  // PUT: crea o reemplaza el registro (1:1 con el diagnóstico); lo no enviado queda vacío y el id se conserva.
  async guardarSituacionPatrimonial(
    clienteId: string,
    dto: CreateSituacionPatrimonialDto,
  ): Promise<SituacionPatrimonial> {
    const diagnostico = await this.diagnosticoDe(clienteId);
    const repo = this.ds.getRepository(SituacionPatrimonial);
    const campos = [
      'saldo_cuenta_individual',
      'aportaciones_voluntarias',
      'ahorros_inversiones_adicionales',
      'bienes_patrimoniales',
      'creditos_deudas_vigentes',
      'ingreso_mensual',
      'otras_fuentes_ingreso',
      'ingreso_conyuge',
      'seguros',
      'estado_salud',
      'padecimientos',
      'estado_civil',
      'edad_conyuge',
      'actividad_economica_conyuge',
    ] as const;
    const valores = Object.fromEntries(campos.map((c) => [c, dto[c] ?? null]));
    try {
      await repo.upsert({ ...valores, diagnostico_f1_id: diagnostico.id } as never, [
        'diagnostico_f1_id',
      ]);
    } catch (error) {
      traducirErrorBd(error, MENSAJES_TEXTO);
    }
    return repo.findOneByOrFail({ diagnostico_f1_id: diagnostico.id });
  }

  listarHijos(clienteId: string): Promise<Record<string, unknown>[]> {
    return this.leerLista(clienteId, 'hijos');
  }

  async agregarHijo(
    clienteId: string,
    dto: CreateSituacionPatrimonialHijosDto,
  ): Promise<Record<string, unknown>> {
    const patrimonial = await this.ds
      .getRepository(SituacionPatrimonial)
      .createQueryBuilder('s')
      .innerJoin(DiagnosticoEspecializado, 'd', 'd.id = s.diagnostico_f1_id')
      .where('d.cliente_id = :clienteId', { clienteId })
      .getOne();
    if (!patrimonial) throw new ConflictException(MENSAJE_SIN_DUENO.patrimonial);
    const id = randomUUID();
    const filas = await this.ds
      .query<Record<string, unknown>[]>(
        `INSERT INTO situacion_patrimonial_hijos (id, situacion_patrimonial_id, edad, tiene_discapacidad)
         VALUES ($1, $2, $3, $4) RETURNING id, situacion_patrimonial_id, edad, tiene_discapacidad`,
        [id, patrimonial.id, dto.edad, dto.tiene_discapacidad ?? false],
      )
      .catch((error: unknown) => traducirErrorBd(error, MENSAJES_TEXTO));
    // INSERT ... RETURNING devuelve [filas, cantidad] según el controlador de pg; se normaliza.
    const fila = (Array.isArray(filas[0]) ? filas[0] : filas) as Record<string, unknown>[];
    return fila[0];
  }

  // ---------- Avance de la etapa 1 (Diagnóstico especializado) ----------

  // Secciones del F1 que se pueden capturar, con su criterio de "completa". Son 13: la 14 (aviso de alcance y
  // firmas) es texto fijo del PDF.
  private static readonly SQL_SECCIONES_COMPLETAS = `
    SELECT
      (EXISTS (SELECT 1 FROM diagnostico_objetivos x WHERE x.diagnostico_id = d.id))::int
      + (EXISTS (SELECT 1 FROM diagnostico_documentos x WHERE x.diagnostico_id = d.id AND x.recibido IS NOT NULL))::int
      + (d.tipo_pension_probable IS NOT NULL AND d.edad_objetivo_pension IS NOT NULL
          AND d.cotizo_antes_julio_1997 IS NOT NULL)::int
      + (d.semanas_efectivas_pension IS NOT NULL)::int
      + (d.tiene_conservacion_derechos IS NOT NULL AND d.dentro_de_conservacion IS NOT NULL
          AND d.conviene_pensionar_ahora IS NOT NULL)::int
      + (EXISTS (SELECT 1 FROM analisis_recuperacion_semanas x WHERE x.diagnostico_id = d.id))::int
      + (d.conclusion_modalidad_10 IS NOT NULL)::int
      + (d.conclusion_modalidad_40 IS NOT NULL AND d.dado_de_baja_regimen_obligatorio IS NOT NULL)::int
      + (EXISTS (SELECT 1 FROM analisis_modalidad40_retroactivo x
                  WHERE x.diagnostico_id = d.id AND x.conclusion_retroactivo IS NOT NULL))::int
      + (EXISTS (SELECT 1 FROM escenario_pension x WHERE x.diagnostico_f1_id = d.id))::int
      + (EXISTS (SELECT 1 FROM situacion_patrimonial x WHERE x.diagnostico_f1_id = d.id))::int
      + (COALESCE(btrim(d.justificacion_estrategia), '') <> ''
          AND EXISTS (SELECT 1 FROM diagnostico_estrategias_recomendadas x WHERE x.diagnostico_id = d.id))::int
      + (EXISTS (SELECT 1 FROM plan_accion x WHERE x.diagnostico_id = d.id))::int AS completas,
      d.asesor_id
    FROM diagnostico_especializado d WHERE d.cliente_id = $1`;

  // Regla: con N de las 13 secciones completas (N >= 1), la etapa 1 está En proceso asesor y su avance es
  // 20 + floor(70 x N / 13), de 25 % (una sección) a 90 % (las 13). Con 0 no se toca la etapa. Solo se mueve
  // una etapa Por iniciar (pasa a En proceso asesor y deja su fila en la bitácora, a nombre del asesor) o ya
  // En proceso asesor (solo cambia el avance): Finalizado, Cancelado, Bloqueado, Detenido o las demás no se
  // tocan. Finalizar la etapa sigue siendo una decisión del asesor en la pantalla de etapas.
  async actualizarAvance(clienteId: string): Promise<void> {
    await this.ds.transaction(async (manager) => {
      const [conteo] = await manager.query<{ completas: number; asesor_id: string }[]>(
        DiagnosticosService.SQL_SECCIONES_COMPLETAS,
        [clienteId],
      );
      if (!conteo || conteo.completas < 1) return;
      const [etapa] = await manager.query<
        { id: string; estatus_id: number; avance_porcentaje: number; nombre: string }[]
      >(
        `SELECT et.id, et.estatus_id, et.avance_porcentaje, s.nombre
           FROM etapas_tramite et
           JOIN etapas_proceso p ON p.id = et.etapa_id
           JOIN estatus_tramite s ON s.id = et.estatus_id
          WHERE et.cliente_id = $1 AND p.numero_paso = 1
          FOR UPDATE OF et`,
        [clienteId],
      );
      if (!etapa || (etapa.nombre !== 'Por iniciar' && etapa.nombre !== 'En proceso asesor'))
        return;
      const avance = 20 + Math.floor((70 * conteo.completas) / 13);
      if (etapa.nombre === 'En proceso asesor') {
        if (etapa.avance_porcentaje !== avance) {
          await manager.query(
            'UPDATE etapas_tramite SET avance_porcentaje = $2, actualizado_el = now() WHERE id = $1',
            [etapa.id, avance],
          );
        }
        return;
      }
      const [enProceso] = await manager.query<{ id: number }[]>(
        "SELECT id FROM estatus_tramite WHERE nombre = 'En proceso asesor'",
      );
      await manager.query(
        'UPDATE etapas_tramite SET estatus_id = $2, avance_porcentaje = $3, actualizado_el = now() WHERE id = $1',
        [etapa.id, enProceso.id, avance],
      );
      await manager.query(
        `INSERT INTO etapas_tramite_historial
           (etapa_tramite_id, estatus_anterior_id, estatus_nuevo_id, motivo_rechazo, cambiado_por, fecha_cambio)
         VALUES ($1, $2, $3, NULL, $4, now())`,
        [etapa.id, etapa.estatus_id, enProceso.id, conteo.asesor_id],
      );
    });
  }

  // El diagnóstico del cliente; sin él, 409 (los demás pasos cuelgan de él).
  private async diagnosticoDe(clienteId: string): Promise<DiagnosticoEspecializado> {
    const diagnostico = await this.ds
      .getRepository(DiagnosticoEspecializado)
      .findOneBy({ cliente_id: clienteId });
    if (!diagnostico) throw new ConflictException(MENSAJE_SIN_DIAGNOSTICO);
    return diagnostico;
  }

  // ---------- Listas que se reemplazan completas (ver listas-f1.ts) ----------

  // Id del dueño de la lista (diagnóstico, análisis de recuperación o de retroactivo) o null si aún no existe.
  // Con `bloquear` toma un bloqueo de la fila del dueño, para que dos PUT simultáneos no se pisen.
  private async duenoDeLista(
    consulta: DataSource | EntityManager,
    clienteId: string,
    dueno: Dueno,
    bloquear: boolean,
  ): Promise<string | null> {
    const bloqueo = bloquear ? ' FOR UPDATE' : '';
    const porDueno: Record<Dueno, string> = {
      diagnostico: `SELECT id FROM diagnostico_especializado WHERE cliente_id = $1${bloqueo}`,
      recuperacion: `SELECT id FROM analisis_recuperacion_semanas
        WHERE diagnostico_id = (SELECT id FROM diagnostico_especializado WHERE cliente_id = $1)${bloqueo}`,
      retroactivo: `SELECT id FROM analisis_modalidad40_retroactivo
        WHERE diagnostico_id = (SELECT id FROM diagnostico_especializado WHERE cliente_id = $1)${bloqueo}`,
      patrimonial: `SELECT id FROM situacion_patrimonial
        WHERE diagnostico_f1_id = (SELECT id FROM diagnostico_especializado WHERE cliente_id = $1)${bloqueo}`,
    };
    const filas = await consulta.query<{ id: string }[]>(porDueno[dueno], [clienteId]);
    return filas[0]?.id ?? null;
  }

  private filasDeLista(consulta: DataSource | EntityManager, def: DefLista, duenoId: string) {
    const orden = def.columnaCatalogo ?? 'ctid';
    return consulta.query<Record<string, unknown>[]>(
      `SELECT ${def.columnas ?? '*'} FROM ${def.tabla} WHERE ${def.columnaDueno} = $1 ORDER BY ${orden}`,
      [duenoId],
    );
  }

  // GET: sin el dueño todavía responde [].
  async leerLista(clienteId: string, clave: string): Promise<Record<string, unknown>[]> {
    const def = LISTAS_F1[clave];
    const duenoId = await this.duenoDeLista(this.ds, clienteId, def.dueno, false);
    return duenoId ? this.filasDeLista(this.ds, def, duenoId) : [];
  }

  // PUT: reemplaza la lista completa en una transacción (borra e inserta). Sin el dueño, 409 diciendo qué falta.
  async reemplazarLista(
    clienteId: string,
    clave: string,
    items: unknown,
  ): Promise<Record<string, unknown>[]> {
    const def = LISTAS_F1[clave];
    const elementos = validarElementos(def, items);
    try {
      return await this.ds.transaction(async (manager) => {
        const duenoId = await this.duenoDeLista(manager, clienteId, def.dueno, true);
        if (!duenoId) throw new ConflictException(MENSAJE_SIN_DUENO[def.dueno]);
        await manager.query(`DELETE FROM ${def.tabla} WHERE ${def.columnaDueno} = $1`, [duenoId]);
        for (const valores of elementos) {
          const conId = def.columnaCatalogo ? {} : { id: randomUUID() };
          const fila = { [def.columnaDueno]: duenoId, ...conId, ...valores };
          const columnas = Object.keys(fila);
          await manager.query(
            `INSERT INTO ${def.tabla} (${columnas.join(', ')})
             VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})`,
            Object.values(fila),
          );
        }
        return this.filasDeLista(manager, def, duenoId);
      });
    } catch (error) {
      return traducirErrorBd(error, {
        llaveForanea: 'Algún elemento indicado no existe en el catálogo.',
        unica: 'La lista cambió mientras se guardaba; vuelve a intentarlo.',
        dato: 'Algún texto enviado contiene caracteres no válidos.',
      });
    }
  }

  // Catálogos: la lista completa de la tabla, ordenada por id.
  listarEstrategias(): Promise<EstrategiaRecomendadaTipo[]> {
    return this.ds.getRepository(EstrategiaRecomendadaTipo).find({ order: { id: 'ASC' } });
  }

  listarObjetivosDiagnostico(): Promise<ObjetivoDiagnostico[]> {
    return this.ds.getRepository(ObjetivoDiagnostico).find({ order: { id: 'ASC' } });
  }

  listarTiposInconsistencia(): Promise<TipoInconsistenciaDetectada[]> {
    return this.ds.getRepository(TipoInconsistenciaDetectada).find({ order: { id: 'ASC' } });
  }

  listarTiposGestionRecuperacion(): Promise<TipoGestionRecuperacion[]> {
    return this.ds.getRepository(TipoGestionRecuperacion).find({ order: { id: 'ASC' } });
  }

  listarTiposEvidenciaRecuperacion(): Promise<TipoEvidenciaRecuperacion[]> {
    return this.ds.getRepository(TipoEvidenciaRecuperacion).find({ order: { id: 'ASC' } });
  }

  listarObjetivosModalidad10(): Promise<ObjetivoModalidad10[]> {
    return this.ds.getRepository(ObjetivoModalidad10).find({ order: { id: 'ASC' } });
  }

  listarObjetivosModalidad40(): Promise<ObjetivoModalidad40[]> {
    return this.ds.getRepository(ObjetivoModalidad40).find({ order: { id: 'ASC' } });
  }

  listarTiposDocumentoDiagnostico(): Promise<TipoDocumentoDiagnostico[]> {
    return this.ds.getRepository(TipoDocumentoDiagnostico).find({ order: { id: 'ASC' } });
  }
}
