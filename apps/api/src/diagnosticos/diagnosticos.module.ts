import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesModule } from '../reportes/reportes.module';
import { DiagnosticosController } from './diagnosticos.controller';
import { DiagnosticosService } from './diagnosticos.service';
import { AnalisisModalidad40Retroactivo } from './entities/analisis-modalidad40-retroactivo.entity';
import { AnalisisRecuperacionSemanas } from './entities/analisis-recuperacion-semanas.entity';
import { DiagnosticoEspecializado } from './entities/diagnostico-especializado.entity';
import { DiagnosticoEstrategiaRecomendada } from './entities/diagnostico-estrategia-recomendada.entity';
import { DiagnosticoInconsistenciaGeneral } from './entities/diagnostico-inconsistencia-general.entity';
import { DiagnosticoObjetivo } from './entities/diagnostico-objetivo.entity';
import { DiagnosticoObjetivoM10 } from './entities/diagnostico-objetivo-m10.entity';
import { DiagnosticoObjetivoM40 } from './entities/diagnostico-objetivo-m40.entity';
import { EscenarioPension } from './entities/escenario-pension.entity';
import { EstrategiaRecomendadaTipo } from './entities/estrategia-recomendada-tipo.entity';
import { Modalidad10Criterio } from './entities/modalidad10-criterio.entity';
import { Modalidad40Criterio } from './entities/modalidad40-criterio.entity';
import { ObjetivoDiagnostico } from './entities/objetivo-diagnostico.entity';
import { ObjetivoModalidad10 } from './entities/objetivo-modalidad10.entity';
import { ObjetivoModalidad40 } from './entities/objetivo-modalidad40.entity';
import { PeriodoInconsistencia } from './entities/periodo-inconsistencia.entity';
import { PlanAccion } from './entities/plan-accion.entity';
import { RecuperacionEvidencia } from './entities/recuperacion-evidencia.entity';
import { RecuperacionGestion } from './entities/recuperacion-gestion.entity';
import { RetroactivoEvaluacionConveniencia } from './entities/retroactivo-evaluacion-conveniencia.entity';
import { SituacionPatrimonial } from './entities/situacion-patrimonial.entity';
import { SituacionPatrimonialHijos } from './entities/situacion-patrimonial-hijos.entity';
import { TipoDocumentoDiagnostico } from './entities/tipo-documento-diagnostico.entity';
import { TipoEvidenciaRecuperacion } from './entities/tipo-evidencia-recuperacion.entity';
import { TipoGestionRecuperacion } from './entities/tipo-gestion-recuperacion.entity';
import { TipoInconsistenciaDetectada } from './entities/tipo-inconsistencia-detectada.entity';

@Module({
  imports: [
    ReportesModule,
    TypeOrmModule.forFeature([
      AnalisisModalidad40Retroactivo,
      AnalisisRecuperacionSemanas,
      DiagnosticoEspecializado,
      DiagnosticoEstrategiaRecomendada,
      DiagnosticoInconsistenciaGeneral,
      DiagnosticoObjetivo,
      DiagnosticoObjetivoM10,
      DiagnosticoObjetivoM40,
      EscenarioPension,
      EstrategiaRecomendadaTipo,
      Modalidad10Criterio,
      Modalidad40Criterio,
      ObjetivoDiagnostico,
      ObjetivoModalidad10,
      ObjetivoModalidad40,
      PeriodoInconsistencia,
      PlanAccion,
      RecuperacionEvidencia,
      RecuperacionGestion,
      RetroactivoEvaluacionConveniencia,
      SituacionPatrimonial,
      SituacionPatrimonialHijos,
      TipoDocumentoDiagnostico,
      TipoEvidenciaRecuperacion,
      TipoGestionRecuperacion,
      TipoInconsistenciaDetectada,
    ]),
  ],
  controllers: [DiagnosticosController],
  providers: [DiagnosticosService],
  exports: [TypeOrmModule],
})
export class DiagnosticosModule {}
