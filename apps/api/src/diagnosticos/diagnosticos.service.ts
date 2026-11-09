import { ConflictException, Injectable, NotImplementedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
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

@Injectable()
export class DiagnosticosService {
  constructor(private readonly ds: DataSource) {}

  async obtenerDiagnostico(clienteId: string): Promise<DiagnosticoEspecializado> {
    throw new NotImplementedException();
  }

  async crearDiagnostico(
    clienteId: string,
    dto: CreateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    throw new NotImplementedException();
  }

  async actualizarDiagnostico(
    clienteId: string,
    dto: UpdateDiagnosticoEspecializadoDto,
  ): Promise<DiagnosticoEspecializado> {
    throw new NotImplementedException();
  }

  async obtenerRecuperacionSemanas(clienteId: string): Promise<AnalisisRecuperacionSemanas> {
    throw new NotImplementedException();
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

  async obtenerModalidad40Retroactivo(clienteId: string): Promise<AnalisisModalidad40Retroactivo> {
    throw new NotImplementedException();
  }

  async guardarModalidad40Retroactivo(
    clienteId: string,
    dto: CreateAnalisisModalidad40RetroactivoDto,
  ): Promise<AnalisisModalidad40Retroactivo> {
    throw new NotImplementedException();
  }

  async listarEscenarios(clienteId: string): Promise<EscenarioPension[]> {
    throw new NotImplementedException();
  }

  async crearEscenario(
    clienteId: string,
    dto: CreateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    throw new NotImplementedException();
  }

  async actualizarEscenario(
    clienteId: string,
    escenarioId: string,
    dto: UpdateEscenarioPensionDto,
  ): Promise<EscenarioPension> {
    throw new NotImplementedException();
  }

  async listarPeriodosInconsistencias(clienteId: string): Promise<PeriodoInconsistencia[]> {
    throw new NotImplementedException();
  }

  async crearPeriodoInconsistencia(
    clienteId: string,
    dto: CreatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    throw new NotImplementedException();
  }

  async actualizarPeriodoInconsistencia(
    clienteId: string,
    periodoId: string,
    dto: UpdatePeriodoInconsistenciaDto,
  ): Promise<PeriodoInconsistencia> {
    throw new NotImplementedException();
  }

  async listarPlanAccion(clienteId: string): Promise<PlanAccion[]> {
    throw new NotImplementedException();
  }

  async crearPlanAccion(clienteId: string, dto: CreatePlanAccionDto): Promise<PlanAccion> {
    throw new NotImplementedException();
  }

  async actualizarPlanAccion(
    clienteId: string,
    planAccionId: string,
    dto: UpdatePlanAccionDto,
  ): Promise<PlanAccion> {
    throw new NotImplementedException();
  }

  async obtenerSituacionPatrimonial(clienteId: string): Promise<SituacionPatrimonial> {
    throw new NotImplementedException();
  }

  async guardarSituacionPatrimonial(
    clienteId: string,
    dto: CreateSituacionPatrimonialDto,
  ): Promise<SituacionPatrimonial> {
    throw new NotImplementedException();
  }

  async listarHijos(clienteId: string): Promise<SituacionPatrimonialHijos[]> {
    throw new NotImplementedException();
  }

  async agregarHijo(
    clienteId: string,
    dto: CreateSituacionPatrimonialHijosDto,
  ): Promise<SituacionPatrimonialHijos> {
    throw new NotImplementedException();
  }

  async listarEstrategias(): Promise<EstrategiaRecomendadaTipo[]> {
    throw new NotImplementedException();
  }

  async listarObjetivosDiagnostico(): Promise<ObjetivoDiagnostico[]> {
    throw new NotImplementedException();
  }

  async listarTiposInconsistencia(): Promise<TipoInconsistenciaDetectada[]> {
    throw new NotImplementedException();
  }

  async listarTiposGestionRecuperacion(): Promise<TipoGestionRecuperacion[]> {
    throw new NotImplementedException();
  }

  async listarTiposEvidenciaRecuperacion(): Promise<TipoEvidenciaRecuperacion[]> {
    throw new NotImplementedException();
  }

  async listarObjetivosModalidad10(): Promise<ObjetivoModalidad10[]> {
    throw new NotImplementedException();
  }

  async listarObjetivosModalidad40(): Promise<ObjetivoModalidad40[]> {
    throw new NotImplementedException();
  }
}
