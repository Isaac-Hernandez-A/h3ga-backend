import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import {
  codigoPostgres,
  PG_VIOLACION_UNICA,
  traducirErrorBd,
} from '../common/database/errores-postgres';
import { aplicarAlcanceClientes } from '../common/auth/clientes-accesibles';
import { ZONA } from '../common/fechas';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CorreccionesListadoRespuesta } from './dto/correcciones-listado-respuesta.dto';
import { CreateCorreccionClienteDto } from './dto/create-correccion-cliente.dto';
import { CreateUnificacionNssDetalleDto } from './dto/create-unificacion-nss-detalle.dto';
import { CreateUnificacionNssSecundarioDto } from './dto/create-unificacion-nss-secundario.dto';
import { UpdateCorreccionClienteDto } from './dto/update-correccion-cliente.dto';
import { CorreccionCliente } from './entities/correccion-cliente.entity';
import { TipoCorreccion } from './entities/tipo-correccion.entity';
import { UnificacionNssDetalle } from './entities/unificacion-nss-detalle.entity';
import { UnificacionNssSecundario } from './entities/unificacion-nss-secundario.entity';
import { columnaDeCorreccion, errorDeDatoCorrecto } from './reglas-correcciones';

// Campos que PATCH puede cambiar de una corrección.
const CAMPOS_EDITABLES = [
  'observaciones',
  'tiempo_promedio',
  'dato_actual',
  'dato_correcto',
] as const;

// Máximo de clientes de GET /correcciones.
const LIMITE_LISTADO_CORRECCIONES = 500;

const TIPO_UNIFICACION_NSS = 'Unificación de NSS (Duplicidad / Multiplicidad)';

// Documentos del catálogo tipo_documento que usa el módulo «Correcciones» (se buscan por nombre).
const DOCUMENTO_UNIFICACION_NSS =
  'Certificación de regularización y/o corrección de datos personales del asegurado (IMSS)';
const DOCUMENTOS_RECUPERACION = [
  'Constancia de Aclaración de Semanas Cotizadas (IMSS)',
  'Solicitud de Reintegro de Recursos (AFORE)',
];

@Injectable()
export class TramitesService {
  constructor(private readonly ds: DataSource) {}

  // En el orden de inserción, el mismo que usa el PDF del F0 (ORDER BY ctid): la tabla no tiene fecha.
  // Un PATCH reescribe la fila, así que una corrección editada pasa al final de la lista.
  listarCorrecciones(clienteId: string): Promise<CorreccionCliente[]> {
    return this.ds.query<CorreccionCliente[]>(
      'SELECT * FROM correcciones_cliente WHERE cliente_id = $1 ORDER BY ctid',
      [clienteId],
    );
  }

  // Registra la corrección F2. Si el tipo modifica el expediente (CURP, RFC, nacimiento, sexo, nombre),
  // dato_correcto es obligatorio y se valida AQUÍ; el expediente se actualiza hasta que la etapa 2
  // pasa a Finalizado (aplicarCorreccionesAlExpediente).
  async crearCorreccion(
    _usuario: AuthenticatedUser,
    clienteId: string,
    dto: CreateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    const tipo = await this.ds
      .getRepository(TipoCorreccion)
      .findOneBy({ id: dto.tipo_correccion_id });
    if (!tipo) throw new BadRequestException('El tipo de corrección indicado no existe.');
    const error = errorDeDatoCorrecto(tipo.nombre, dto.dato_correcto);
    if (error) throw new BadRequestException(error);
    const repo = this.ds.getRepository(CorreccionCliente);
    try {
      return await repo.save(
        repo.create({ ...dto, cliente_id: clienteId, dato_correcto: dto.dato_correcto?.trim() }),
      );
    } catch (error) {
      return traducirErrorBd(error, {
        dato: 'Algún texto enviado contiene caracteres no válidos.',
      });
    }
  }

  // Regla D2: copia dato_correcto al expediente según el tipo (CURP a curp, RFC a rfc, fecha de
  // nacimiento, sexo y nombre; el nombre solo toca clientes.nombre, no los apellidos). Los demás tipos
  // no sobrescriben nada. Corre dentro de la transacción de quien la llama: si falla, se deshace todo.
  // Si hay varias correcciones del mismo tipo, prevalece la registrada al final.
  async aplicarCorreccionesAlExpediente(manager: EntityManager, clienteId: string): Promise<void> {
    const filas = await manager.query<{ tipo: string; dato_correcto: string }[]>(
      `SELECT t.nombre AS tipo, c.dato_correcto
         FROM correcciones_cliente c JOIN tipo_correccion t ON t.id = c.tipo_correccion_id
        WHERE c.cliente_id = $1 AND c.dato_correcto IS NOT NULL
        ORDER BY c.ctid`,
      [clienteId],
    );
    const cambios: Record<string, string> = {};
    for (const fila of filas) {
      const columna = columnaDeCorreccion(fila.tipo);
      if (columna) cambios[columna] = fila.dato_correcto.trim();
    }
    if (Object.keys(cambios).length === 0) return;
    try {
      await manager.update(Cliente, { id: clienteId }, cambios as unknown as Partial<Cliente>);
    } catch (error) {
      if (codigoPostgres(error) === PG_VIOLACION_UNICA) {
        throw new ConflictException('La CURP corregida ya pertenece a otro cliente.');
      }
      throw error;
    }
  }

  async obtenerCorreccion(clienteId: string, correccionId: string): Promise<CorreccionCliente> {
    return this.correccionDelCliente(this.ds.manager, clienteId, correccionId);
  }

  // Actualización parcial de observaciones, tiempo_promedio, dato_actual y dato_correcto (el tipo no cambia).
  // Se valida el dato_correcto RESULTANTE con las mismas reglas que crearCorreccion: en los tipos que
  // modifican el expediente no puede quedar vacío ni con formato inválido. La fila se bloquea para que dos
  // PATCH simultáneos no se pisen entre la validación y el guardado.
  async actualizarCorreccion(
    clienteId: string,
    correccionId: string,
    dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    try {
      return await this.guardarCambios(clienteId, correccionId, dto);
    } catch (error) {
      return traducirErrorBd(error, {
        dato: 'Algún texto enviado contiene caracteres no válidos.',
      });
    }
  }

  private guardarCambios(
    clienteId: string,
    correccionId: string,
    dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    return this.ds.transaction(async (manager) => {
      const actual = await manager.findOne(CorreccionCliente, {
        where: { id: correccionId, cliente_id: clienteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual) throw new NotFoundException('Corrección no encontrada.');
      const tipo = await manager.findOneByOrFail(TipoCorreccion, { id: actual.tipo_correccion_id });

      const cambios: Partial<Record<(typeof CAMPOS_EDITABLES)[number], string | null>> = {};
      for (const campo of CAMPOS_EDITABLES) {
        if (dto[campo] !== undefined) cambios[campo] = dto[campo];
      }
      if (typeof cambios.dato_correcto === 'string') {
        cambios.dato_correcto = cambios.dato_correcto.trim();
      }
      const resultante = 'dato_correcto' in cambios ? cambios.dato_correcto : actual.dato_correcto;
      const error = errorDeDatoCorrecto(tipo.nombre, resultante);
      if (error) throw new BadRequestException(error);

      if (Object.keys(cambios).length > 0) {
        await manager.update(CorreccionCliente, { id: correccionId }, cambios);
      }
      return manager.findOneByOrFail(CorreccionCliente, { id: correccionId });
    });
  }

  // Quita una corrección del cliente. Si es una unificación de NSS se borran antes su detalle y sus NSS
  // secundarios (las claves foráneas no son en cascada), todo en una transacción. Se bloquea la fila de la
  // corrección para que un borrado simultáneo o una edición no dejen datos a medias. No revierte el
  // expediente: si dato_correcto ya se aplicó al finalizar la etapa 2, el cambio en `clientes` se queda.
  async eliminarCorreccion(clienteId: string, correccionId: string): Promise<void> {
    await this.ds.transaction(async (manager) => {
      const correccion = await manager.findOne(CorreccionCliente, {
        where: { id: correccionId, cliente_id: clienteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!correccion) throw new NotFoundException('Corrección no encontrada.');
      await manager.query(
        `DELETE FROM unificacion_nss_secundarios
         WHERE unificacion_id IN (SELECT id FROM unificacion_nss_detalle WHERE correccion_id = $1)`,
        [correccionId],
      );
      await manager.delete(UnificacionNssDetalle, { correccion_id: correccionId });
      await manager.delete(CorreccionCliente, { id: correccionId });
    });
  }

  // F3: el detalle de la unificación. 404 si la corrección no es del cliente o aún no tiene detalle.
  async obtenerUnificacionNss(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssDetalle> {
    await this.correccionDelCliente(this.ds.manager, clienteId, correccionId);
    const detalle = await this.ds
      .getRepository(UnificacionNssDetalle)
      .findOneBy({ correccion_id: correccionId });
    if (!detalle) {
      throw new NotFoundException('La corrección no tiene detalle de unificación de NSS.');
    }
    return detalle;
  }

  // F3: PUT idempotente (un detalle por corrección). Solo aplica a correcciones de unificación de NSS y
  // el principal no puede coincidir con un secundario ya registrado.
  async guardarUnificacionNss(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssDetalleDto,
  ): Promise<UnificacionNssDetalle> {
    return this.ds.transaction(async (manager) => {
      const correccion = await this.correccionDelCliente(manager, clienteId, correccionId);
      const tipo = await manager.findOneByOrFail(TipoCorreccion, {
        id: correccion.tipo_correccion_id,
      });
      if (tipo.nombre !== TIPO_UNIFICACION_NSS) {
        throw new BadRequestException('La corrección indicada no es una unificación de NSS.');
      }
      const actual = await manager.findOne(UnificacionNssDetalle, {
        where: { correccion_id: correccionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (actual) {
        const choca = await manager.exists(UnificacionNssSecundario, {
          where: { unificacion_id: actual.id, nss: dto.nss_principal_elegido },
        });
        if (choca) {
          throw new BadRequestException('El NSS principal no puede ser uno de los secundarios.');
        }
      }
      await manager.upsert(UnificacionNssDetalle, { ...dto, correccion_id: correccionId }, [
        'correccion_id',
      ]);
      return manager.findOneByOrFail(UnificacionNssDetalle, { correccion_id: correccionId });
    });
  }

  // F3: los NSS secundarios; lista vacía si la corrección aún no tiene detalle. 404 si no es del cliente.
  async listarNssSecundarios(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssSecundario[]> {
    await this.correccionDelCliente(this.ds.manager, clienteId, correccionId);
    return this.ds
      .getRepository(UnificacionNssSecundario)
      .createQueryBuilder('s')
      .innerJoin(UnificacionNssDetalle, 'd', 'd.id = s.unificacion_id')
      .where('d.correccion_id = :correccionId', { correccionId })
      .orderBy('s.nss', 'ASC')
      .addOrderBy('s.id', 'ASC')
      .getMany();
  }

  // F3: el secundario no puede ser el principal (400) ni repetirse (409). Se bloquea la fila del detalle
  // para que dos altas simultáneas del mismo NSS no dejen duplicados (la tabla no tiene UNIQUE).
  async agregarNssSecundario(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssSecundarioDto,
  ): Promise<UnificacionNssSecundario> {
    return this.ds.transaction(async (manager) => {
      await this.correccionDelCliente(manager, clienteId, correccionId);
      const detalle = await manager.findOne(UnificacionNssDetalle, {
        where: { correccion_id: correccionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!detalle) {
        throw new ConflictException('Registra primero la unificación de NSS (NSS principal).');
      }
      if (dto.nss === detalle.nss_principal_elegido) {
        throw new BadRequestException('El NSS secundario no puede ser igual al principal.');
      }
      const repetido = await manager.exists(UnificacionNssSecundario, {
        where: { unificacion_id: detalle.id, nss: dto.nss },
      });
      if (repetido) throw new ConflictException('Ese NSS secundario ya está registrado.');
      return manager.save(
        manager.create(UnificacionNssSecundario, {
          unificacion_id: detalle.id,
          nss: dto.nss,
          observaciones: dto.observaciones ?? null,
        }),
      );
    });
  }

  // Módulo «Correcciones»: los clientes del asesor que REQUIEREN al menos una fase, con sus etapas 2, 3 y 4
  // y si cada fase se requiere, en UNA consulta. F2: tiene alguna corrección que no es de unificación de
  // NSS; F3: tiene una de unificación de NSS; F4: su diagnóstico especializado tiene un análisis de
  // recuperación de semanas con aplica = 'si' o 'requiere_mas_evidencia'. El resumen cuenta todos los
  // clientes que cumplen, aunque la lista se corte en 500. La tabla clientes no tiene fecha de creación:
  // para un cliente sin etapas se usa fecha_ingreso. Los tipos se identifican por nombre (no por id).
  async listarCorreccionesDelAsesor(
    usuario: AuthenticatedUser,
  ): Promise<CorreccionesListadoRespuesta> {
    const alcance = this.ds
      .createQueryBuilder()
      .select('c.id', 'id')
      .addSelect("concat_ws(' ', c.nombre, c.apellido_paterno, c.apellido_materno)", 'nombre')
      .addSelect(`(c.fecha_ingreso::timestamp AT TIME ZONE '${ZONA}')`, 'creado')
      .from(Cliente, 'c');
    aplicarAlcanceClientes(alcance, usuario, 'c');
    const [sqlAlcance, parametros] = alcance.getQueryAndParameters();
    const lit = (texto: string) => `'${texto.replace(/'/g, "''")}'`;
    const filas = await this.ds.query<
      {
        cliente_id: string;
        cliente_nombre: string;
        actualizado_el: Date;
        fases: CorreccionesListadoRespuesta['clientes'][number]['fases'];
        total: number;
        por_subir: number;
      }[]
    >(
      `WITH alcance AS (${sqlAlcance}),
       f AS (
         SELECT et.cliente_id, ep.numero_paso, et.id AS etapa_tramite_id, et.estatus_id,
                est.nombre AS estatus, et.avance_porcentaje, et.fecha_compromiso,
                et.accion_a_realizar, et.actualizado_el
         FROM etapas_tramite et
         JOIN etapas_proceso ep ON ep.id = et.etapa_id AND ep.numero_paso IN (2, 3, 4)
         JOIN estatus_tramite est ON est.id = et.estatus_id
         WHERE et.cliente_id IN (SELECT id FROM alcance)),
       ult AS (SELECT cliente_id, max(actualizado_el) AS ultima FROM f GROUP BY cliente_id),
       corr AS (
         SELECT cc.cliente_id,
                count(*) FILTER (WHERE tc.nombre <> ${lit(TIPO_UNIFICACION_NSS)})::int AS n_f2,
                count(*) FILTER (WHERE tc.nombre = ${lit(TIPO_UNIFICACION_NSS)})::int AS n_f3
         FROM correcciones_cliente cc
         JOIN tipo_correccion tc ON tc.id = cc.tipo_correccion_id
         WHERE cc.cliente_id IN (SELECT id FROM alcance)
         GROUP BY cc.cliente_id),
       rec AS (
         SELECT DISTINCT d.cliente_id
         FROM diagnostico_especializado d
         JOIN analisis_recuperacion_semanas a ON a.diagnostico_id = d.id
           AND a.aplica IN ('si', 'requiere_mas_evidencia')
         WHERE d.cliente_id IN (SELECT id FROM alcance)),
       docs AS (
         SELECT dc.cliente_id,
                count(*) FILTER (WHERE td.nombre = ${lit(DOCUMENTO_UNIFICACION_NSS)})::int AS d_f3,
                count(*) FILTER (WHERE td.nombre IN (${DOCUMENTOS_RECUPERACION.map(lit).join(', ')}))::int AS d_f4
         FROM documentos_clientes dc
         JOIN tipo_documento td ON td.id = dc.tipo_documento_id
         WHERE dc.cliente_id IN (SELECT id FROM alcance)
         GROUP BY dc.cliente_id),
       base AS (
         SELECT a.id, a.nombre, COALESCE(u.ultima, a.creado) AS actualizado_el,
                COALESCE(c.n_f2, 0) AS n_f2,
                COALESCE(c.n_f2, 0) > 0 AS r2,
                COALESCE(c.n_f3, 0) > 0 AS r3,
                (rec.cliente_id IS NOT NULL) AS r4,
                COALESCE(d.d_f3, 0) AS d_f3, COALESCE(d.d_f4, 0) AS d_f4
         FROM alcance a
         LEFT JOIN ult u ON u.cliente_id = a.id
         LEFT JOIN corr c ON c.cliente_id = a.id
         LEFT JOIN rec ON rec.cliente_id = a.id
         LEFT JOIN docs d ON d.cliente_id = a.id),
       req AS (SELECT * FROM base WHERE r2 OR r3 OR r4),
       res AS (
         SELECT count(*)::int AS total,
                (count(*) FILTER (WHERE r3 AND d_f3 = 0)
                 + count(*) FILTER (WHERE r4 AND d_f4 = 0))::int AS por_subir
         FROM req)
       SELECT r.id AS cliente_id, r.nombre AS cliente_nombre, r.actualizado_el,
              (SELECT json_agg(json_build_object(
                        'numero_paso', p.n,
                        'etapa_tramite_id', f.etapa_tramite_id,
                        'estatus_id', f.estatus_id,
                        'estatus', f.estatus,
                        'avance_porcentaje', COALESCE(f.avance_porcentaje, 0),
                        'fecha_compromiso', to_char(f.fecha_compromiso, 'YYYY-MM-DD'),
                        'accion_a_realizar', f.accion_a_realizar,
                        'requiere', CASE p.n WHEN 2 THEN r.r2 WHEN 3 THEN r.r3 ELSE r.r4 END,
                        'correcciones', CASE p.n WHEN 2 THEN r.n_f2 END,
                        'documentos_cargados', CASE p.n WHEN 3 THEN r.d_f3 WHEN 4 THEN r.d_f4 END
                      ) ORDER BY p.n)
               FROM (VALUES (2), (3), (4)) AS p(n)
               LEFT JOIN f ON f.cliente_id = r.id AND f.numero_paso = p.n) AS fases,
              res.total, res.por_subir
       FROM req r
       CROSS JOIN res
       ORDER BY r.actualizado_el DESC, r.nombre, r.id
       LIMIT ${LIMITE_LISTADO_CORRECCIONES}`,
      parametros,
    );
    return {
      resumen: {
        clientes_con_correcciones: filas[0]?.total ?? 0,
        documentos_por_subir: filas[0]?.por_subir ?? 0,
      },
      clientes: filas.map((f) => ({
        cliente_id: f.cliente_id,
        cliente_nombre: f.cliente_nombre,
        actualizado_el: f.actualizado_el,
        fases: f.fases,
      })),
    };
  }

  // Catálogo: la lista completa de la tabla, ordenada por id.
  listarTiposCorreccion(): Promise<TipoCorreccion[]> {
    return this.ds.getRepository(TipoCorreccion).find({ order: { id: 'ASC' } });
  }

  private async correccionDelCliente(
    manager: EntityManager,
    clienteId: string,
    correccionId: string,
  ): Promise<CorreccionCliente> {
    const correccion = await manager.findOneBy(CorreccionCliente, {
      id: correccionId,
      cliente_id: clienteId,
    });
    if (!correccion) throw new NotFoundException('Corrección no encontrada.');
    return correccion;
  }
}
