import { DataSource } from 'typeorm';
import { Afore } from '../../clientes/entities/afore.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { HistorialLaboral } from '../../clientes/entities/historial-laboral.entity';
import { LeyProbable } from '../../clientes/entities/ley-probable.entity';
import { AnalisisModalidad40Retroactivo } from '../../diagnosticos/entities/analisis-modalidad40-retroactivo.entity';
import { AnalisisRecuperacionSemanas } from '../../diagnosticos/entities/analisis-recuperacion-semanas.entity';
import { DiagnosticoEspecializado } from '../../diagnosticos/entities/diagnostico-especializado.entity';
import { EscenarioPension } from '../../diagnosticos/entities/escenario-pension.entity';
import { PeriodoInconsistencia } from '../../diagnosticos/entities/periodo-inconsistencia.entity';
import { PlanAccion } from '../../diagnosticos/entities/plan-accion.entity';
import { SituacionPatrimonial } from '../../diagnosticos/entities/situacion-patrimonial.entity';
import { Usuario } from '../../usuarios-roles/entities/usuario.entity';

export interface ItemCatalogo {
  id: number;
  nombre: string;
}

// Selección de una tabla puente: id del catálogo -> detalle "Otro" (o null).
export type Seleccion = Map<number, string | null>;

export interface FilaCriterio {
  criterio: string;
  cumple?: boolean | null;
  cumplimiento?: string | null;
  observaciones: string | null;
}

export interface DatosF1 {
  cliente: Cliente;
  asesor: string | null;
  ley: string | null;
  afore: string | null;
  ultimoPatron: string | null;
  diagnostico: DiagnosticoEspecializado;
  catalogos: Record<
    | 'objetivos'
    | 'documentos'
    | 'inconsistencias'
    | 'gestiones'
    | 'evidencias'
    | 'm10'
    | 'm40'
    | 'estrategias',
    ItemCatalogo[]
  >;
  objetivos: Seleccion;
  inconsistencias: Seleccion;
  gestiones: Seleccion;
  evidencias: Seleccion;
  objetivosM10: Seleccion;
  objetivosM40: Seleccion;
  estrategias: Seleccion;
  documentos: Map<number, { recibido: boolean | null; observaciones: string | null }>;
  recuperacion: AnalisisRecuperacionSemanas | null;
  criteriosM10: FilaCriterio[];
  criteriosM40: FilaCriterio[];
  retroactivo: AnalisisModalidad40Retroactivo | null;
  conveniencia: { pregunta: string; respuesta: boolean | null }[];
  escenarios: EscenarioPension[];
  periodos: PeriodoInconsistencia[];
  plan: PlanAccion[];
  patrimonial: SituacionPatrimonial | null;
  hijos: { edad: number; tiene_discapacidad: boolean }[];
}

export interface CampoFaltante {
  seccion: string;
  campo: string;
  etiqueta: string;
}

const CATALOGOS: Record<keyof DatosF1['catalogos'], string> = {
  objetivos: 'objetivo_diagnostico',
  documentos: 'tipo_documento_diagnostico',
  inconsistencias: 'tipo_inconsistencia_detectada',
  gestiones: 'tipo_gestion_recuperacion',
  evidencias: 'tipo_evidencia_recuperacion',
  m10: 'objetivo_modalidad_10',
  m40: 'objetivo_modalidad_40',
  estrategias: 'estrategia_recomendada_tipo',
};

const seleccion = (filas: { id: number; detalle_otro: string | null }[]): Seleccion =>
  new Map(filas.map((f) => [f.id, f.detalle_otro]));

// Carga todo lo que imprime el F1 de un cliente. null si el cliente no existe; `diagnostico` es null (error
// del llamador) si todavía no se creó.
export async function cargarDatosF1(
  ds: DataSource,
  clienteId: string,
): Promise<{ cliente: Cliente; datos: DatosF1 | null } | null> {
  const cliente = await ds.getRepository(Cliente).findOneBy({ id: clienteId });
  if (!cliente) return null;
  const diagnostico = await ds
    .getRepository(DiagnosticoEspecializado)
    .findOneBy({ cliente_id: clienteId });
  if (!diagnostico) return { cliente, datos: null };
  const d = diagnostico.id;

  const puente = (tabla: string, columna: string, dueno: string, duenoId: string) =>
    ds.query<{ id: number; detalle_otro: string | null }[]>(
      `SELECT ${columna} AS id, detalle_otro FROM ${tabla} WHERE ${dueno} = $1`,
      [duenoId],
    );
  const recuperacion = await ds
    .getRepository(AnalisisRecuperacionSemanas)
    .findOneBy({ diagnostico_id: d });
  const retroactivo = await ds
    .getRepository(AnalisisModalidad40Retroactivo)
    .findOneBy({ diagnostico_id: d });
  const patrimonial = await ds
    .getRepository(SituacionPatrimonial)
    .findOneBy({ diagnostico_f1_id: d });
  const vacio = Promise.resolve([] as { id: number; detalle_otro: string | null }[]);

  const [
    asesor,
    ley,
    afore,
    historial,
    catalogosFilas,
    objetivos,
    inconsistencias,
    gestiones,
    evidencias,
    objetivosM10,
    objetivosM40,
    estrategias,
    documentos,
    criteriosM10,
    criteriosM40,
    conveniencia,
    escenarios,
    periodos,
    plan,
    hijos,
  ] = await Promise.all([
    ds.getRepository(Usuario).findOneBy({ id: diagnostico.asesor_id }),
    ds.getRepository(LeyProbable).findOneBy({ id: cliente.ley_probable_id }),
    ds.getRepository(Afore).findOneBy({ id: cliente.afore_id }),
    ds.getRepository(HistorialLaboral).findOneBy({ cliente_id: clienteId }),
    Promise.all(
      Object.values(CATALOGOS).map((tabla) =>
        ds.query<ItemCatalogo[]>(`SELECT id, nombre FROM ${tabla} ORDER BY id`),
      ),
    ),
    puente('diagnostico_objetivos', 'objetivo_id', 'diagnostico_id', d),
    puente('diagnostico_inconsistencias_generales', 'tipo_id', 'diagnostico_id', d),
    recuperacion
      ? puente('recuperacion_gestiones', 'tipo_gestion_id', 'analisis_id', recuperacion.id)
      : vacio,
    recuperacion
      ? puente('recuperacion_evidencias', 'tipo_evidencia_id', 'analisis_id', recuperacion.id)
      : vacio,
    puente('diagnostico_objetivos_m10', 'objetivo_id', 'diagnostico_id', d),
    puente('diagnostico_objetivos_m40', 'objetivo_id', 'diagnostico_id', d),
    puente('diagnostico_estrategias_recomendadas', 'estrategia_id', 'diagnostico_id', d),
    ds.query<{ id: number; recibido: boolean | null; observaciones: string | null }[]>(
      'SELECT tipo_documento_id AS id, recibido, observaciones FROM diagnostico_documentos WHERE diagnostico_id = $1',
      [d],
    ),
    ds.query<FilaCriterio[]>(
      'SELECT criterio, cumple, observaciones FROM modalidad10_criterios WHERE diagnostico_id = $1 ORDER BY ctid',
      [d],
    ),
    ds.query<FilaCriterio[]>(
      'SELECT criterio, cumplimiento, observaciones FROM modalidad40_criterios WHERE diagnostico_id = $1 ORDER BY ctid',
      [d],
    ),
    retroactivo
      ? ds.query<{ pregunta: string; respuesta: boolean | null }[]>(
          'SELECT pregunta, respuesta FROM retroactivo_evaluacion_conveniencia WHERE retroactivo_id = $1 ORDER BY ctid',
          [retroactivo.id],
        )
      : Promise.resolve([]),
    ds
      .getRepository(EscenarioPension)
      .find({ where: { diagnostico_f1_id: d }, order: { orden: 'ASC' } }),
    ds.query<PeriodoInconsistencia[]>(
      'SELECT * FROM periodos_inconsistencias WHERE cliente_id = $1 ORDER BY ctid',
      [clienteId],
    ),
    ds.query<PlanAccion[]>('SELECT * FROM plan_accion WHERE diagnostico_id = $1 ORDER BY ctid', [
      d,
    ]),
    patrimonial
      ? ds.query<{ edad: number; tiene_discapacidad: boolean }[]>(
          'SELECT edad, tiene_discapacidad FROM situacion_patrimonial_hijos WHERE situacion_patrimonial_id = $1 ORDER BY ctid',
          [patrimonial.id],
        )
      : Promise.resolve([]),
  ]);

  const claves = Object.keys(CATALOGOS) as (keyof DatosF1['catalogos'])[];
  const catalogos = Object.fromEntries(
    claves.map((clave, i) => [clave, catalogosFilas[i]]),
  ) as DatosF1['catalogos'];

  return {
    cliente,
    datos: {
      cliente,
      asesor: asesor ? `${asesor.nombre} ${asesor.apellido_paterno}` : null,
      ley: ley?.nombre ?? null,
      afore: afore?.nombre ?? null,
      ultimoPatron: historial?.ultimo_patron ?? null,
      diagnostico,
      catalogos,
      objetivos: seleccion(objetivos),
      inconsistencias: seleccion(inconsistencias),
      gestiones: seleccion(gestiones),
      evidencias: seleccion(evidencias),
      objetivosM10: seleccion(objetivosM10),
      objetivosM40: seleccion(objetivosM40),
      estrategias: seleccion(estrategias),
      documentos: new Map(
        documentos.map((x) => [x.id, { recibido: x.recibido, observaciones: x.observaciones }]),
      ),
      recuperacion,
      criteriosM10,
      criteriosM40,
      retroactivo,
      conveniencia,
      escenarios,
      periodos,
      plan,
      patrimonial,
      hijos,
    },
  };
}

// Campos que el formato exige (los que antes eran NOT NULL en la base) y cómo se llaman en el formato.
const ETIQUETAS_DIAGNOSTICO: Record<string, string> = {
  cotizo_antes_julio_1997: '¿Cotizó antes del 1 de julio de 1997? (sección 3)',
  tipo_pension_probable: 'Tipo de pensión probable (sección 3)',
  edad_objetivo_pension: 'Edad objetivo de pensión (sección 3)',
  tiene_conservacion_derechos: '¿Tiene conservación de derechos? (sección 3)',
  dentro_de_conservacion: '¿Está dentro de conservación? (sección 6)',
  conviene_pensionar_ahora: '¿Conviene pensionar ahora? (sección 6)',
  semanas_efectivas_pension: 'Semanas efectivas para pensión (sección 4)',
  trabaja_cuenta_propia: '¿Trabaja por cuenta propia? (sección 7)',
  conclusion_modalidad_10: 'Conclusión preliminar Modalidad 10 (sección 7)',
  dado_de_baja_regimen_obligatorio: '¿Fue dado de baja del régimen obligatorio? (sección 8)',
  conclusion_modalidad_40: 'Conclusión preliminar Modalidad 40 (sección 8)',
  justificacion_estrategia: 'Justificación de la estrategia (sección 12)',
};
const ETIQUETAS_PATRIMONIAL: Record<string, string> = {
  saldo_cuenta_individual: 'Saldo actual de la cuenta individual',
  aportaciones_voluntarias: 'Aportaciones voluntarias existentes',
  ahorros_inversiones_adicionales: 'Ahorros e inversiones adicionales',
  bienes_patrimoniales: 'Bienes patrimoniales',
  creditos_deudas_vigentes: 'Créditos o deudas vigentes',
  ingreso_mensual: 'Salario o ingreso mensual',
  otras_fuentes_ingreso: 'Rentas, inversiones u otras fuentes de ingreso',
  ingreso_conyuge: 'Ingresos del cónyuge o pareja',
  seguros: 'Seguros',
  estado_salud: 'Estado de salud',
  padecimientos: 'Padecimientos detectados',
  estado_civil: 'Estado civil',
};
const ETIQUETAS_ESCENARIO: Record<string, string> = {
  semanas_proyectadas: 'Semanas proyectadas',
  salario_promedio_proyectado: 'Salario promedio proyectado',
  pension_mensual_estimada: 'Pensión mensual proyectada',
  incremento_mensual: 'Incremento mensual de pensión',
};
const ETIQUETAS_RETROACTIVO: Record<string, string> = {
  dentro_de_plazo_reingreso: '¿Está dentro de plazo para reingreso? (sección 9)',
  conclusion_retroactivo: 'Conclusión preliminar sobre retroactivo (sección 9)',
};

const vacio = (valor: unknown) =>
  valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');

// Lista de lo que falta para imprimir el formato completo. Vacía = se puede generar el PDF.
export function faltantesF1(datos: DatosF1): CampoFaltante[] {
  const faltan: CampoFaltante[] = [];
  const revisar = (
    seccion: string,
    fila: object,
    etiquetas: Record<string, string>,
    prefijo = '',
  ) => {
    for (const [campo, etiqueta] of Object.entries(etiquetas)) {
      if (vacio((fila as Record<string, unknown>)[campo])) {
        faltan.push({ seccion, campo, etiqueta: `${prefijo}${etiqueta}` });
      }
    }
  };
  revisar('diagnostico', datos.diagnostico, ETIQUETAS_DIAGNOSTICO);
  if (datos.patrimonial) revisar('situacion_patrimonial', datos.patrimonial, ETIQUETAS_PATRIMONIAL);
  for (const escenario of datos.escenarios) {
    revisar('escenarios', escenario, ETIQUETAS_ESCENARIO, `Escenario ${escenario.orden}: `);
  }
  if (datos.retroactivo) revisar('retroactivo', datos.retroactivo, ETIQUETAS_RETROACTIVO);
  return faltan;
}
