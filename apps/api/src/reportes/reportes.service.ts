import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { aplicarAlcanceClientes } from '../common/auth/clientes-accesibles';
import {
  DIAS_ANTES_AVISO,
  fechaLocal,
  PeriodoReporte,
  rangoDePeriodo,
  Reloj,
  sumarDias,
  ZONA,
} from '../common/fechas';
import { Cliente } from '../clientes/entities/cliente.entity';
import { RegimenPrincipal } from '../clientes/entities/regimen-principal.entity';
import { EstatusTramite } from '../etapas/entities/estatus-tramite.entity';
import { EtapaProceso } from '../etapas/entities/etapa-proceso.entity';
import { EtapaTramite } from '../etapas/entities/etapa-tramite.entity';
import { EtapaTramiteHistorial } from '../etapas/entities/etapa-tramite-historial.entity';
import { Usuario } from '../usuarios-roles/entities/usuario.entity';
import {
  AvanceDeAsesor,
  ClientesNuevos,
  EtapaFinalizada,
  EtapaPorVencer,
  Finalizados,
  FilaCartera,
  Rechazo,
  ReporteOperativo,
  Vencimientos,
} from './reporte-operativo';

// El reporte cubre solo las etapas 0 a 4 (F0 a F4); las demás pertenecen a otro módulo.
const ULTIMA_ETAPA = 4;
const LIMITE_LISTA = 10;
const LIMITE_MOTIVOS = 5;
// Una etapa en estos estatus no está pendiente: no cuenta como vencida ni por vencer.
const ESTATUS_SIN_PENDIENTE = ['Finalizado', 'Cancelado', 'No aplica'];

const NOMBRE_CLIENTE = "c.nombre || ' ' || c.apellido_paterno || ' ' || c.apellido_materno";
// Inicio del día `:desde` y fin (exclusivo) del día `:hasta`, en la zona de negocio.
const INICIO_PERIODO = `(CAST(CAST(:desde AS date) AS timestamp) AT TIME ZONE '${ZONA}')`;
const FIN_PERIODO = `(CAST(CAST(:hasta AS date) + 1 AS timestamp) AT TIME ZONE '${ZONA}')`;

const entero = (valor: unknown): number => Number(valor ?? 0);
const redondear = (valor: number, decimales: number): number => {
  const k = 10 ** decimales;
  return Math.round(valor * k) / k;
};

@Injectable()
export class ReportesService {
  constructor(
    private readonly ds: DataSource,
    private readonly reloj: Reloj,
  ) {}

  // Reporte operativo del periodo (semanal o mensual) que contiene a `fecha` (por defecto, hoy en Cancún).
  // Todo se calcula con el alcance del usuario: el asesor ve sus clientes; el supervisor, todos y además el
  // desglose por asesor. El auxiliar no tiene acceso (RolesGuard ya lo niega; aquí se repite por defensa).
  async generar(
    usuario: AuthenticatedUser,
    entrada: { periodo: PeriodoReporte; fecha?: string },
  ): Promise<ReporteOperativo> {
    if (usuario.rol === 'auxiliar') throw new ForbiddenException();
    const hoy = fechaLocal(this.reloj.ahora());
    let rango: { desde: string; hasta: string };
    try {
      rango = rangoDePeriodo(entrada.periodo, entrada.fecha ?? hoy);
    } catch {
      throw new BadRequestException('fecha no es una fecha válida (AAAA-MM-DD).');
    }

    const [cartera, finalizados, vencimientos, rechazo, clientesNuevos, porAsesor] =
      await Promise.all([
        this.cartera(usuario),
        this.finalizados(usuario, rango),
        this.vencimientos(usuario, hoy),
        this.rechazo(usuario, rango),
        this.clientesNuevos(usuario, rango),
        usuario.rol === 'supervisor' ? this.porAsesor(usuario) : Promise.resolve(undefined),
      ]);

    const reporte: ReporteOperativo = {
      periodo: entrada.periodo,
      desde: rango.desde,
      hasta: rango.hasta,
      hoy,
      alcance: usuario.rol === 'supervisor' ? 'supervisor' : 'asesor',
      cartera,
      finalizados,
      vencimientos,
      rechazo,
      clientes_nuevos: clientesNuevos,
    };
    if (porAsesor) reporte.por_asesor = porAsesor;
    return reporte;
  }

  // Etapas 0 a 4 de los clientes del alcance, con su estatus y etapa del catálogo.
  private etapas(usuario: AuthenticatedUser): SelectQueryBuilder<EtapaTramite> {
    const qb = this.ds
      .createQueryBuilder()
      .from(EtapaTramite, 'et')
      .innerJoin(EtapaProceso, 'ep', 'ep.id = et.etapa_id')
      .innerJoin(EstatusTramite, 'es', 'es.id = et.estatus_id')
      .innerJoin(Cliente, 'c', 'c.id = et.cliente_id')
      .where('ep.numero_paso <= :ultimaEtapa', { ultimaEtapa: ULTIMA_ETAPA });
    return aplicarAlcanceClientes(qb as SelectQueryBuilder<EtapaTramite>, usuario, 'c');
  }

  // Matriz de conteo de etapas por estatus (RF-32): una fila por etapa 0 a 4 y una columna por estatus.
  private async cartera(usuario: AuthenticatedUser) {
    const [estatus, etapas, conteos] = await Promise.all([
      this.ds.getRepository(EstatusTramite).find({ order: { id: 'ASC' } }),
      this.ds
        .getRepository(EtapaProceso)
        .createQueryBuilder('ep')
        .where('ep.numero_paso <= :ultimaEtapa', { ultimaEtapa: ULTIMA_ETAPA })
        .orderBy('ep.numero_paso', 'ASC')
        .getMany(),
      this.etapas(usuario)
        .select('ep.numero_paso', 'numero_paso')
        .addSelect('es.nombre', 'estatus')
        .addSelect('COUNT(*)', 'total')
        .groupBy('ep.numero_paso')
        .addGroupBy('es.nombre')
        .getRawMany<{ numero_paso: number; estatus: string; total: string }>(),
    ]);
    const nombres = estatus.map((e) => e.nombre);
    const filas: FilaCartera[] = etapas.map((etapa) => {
      const porEstatus = Object.fromEntries(nombres.map((n) => [n, 0]));
      for (const c of conteos) {
        if (Number(c.numero_paso) === etapa.numero_paso) porEstatus[c.estatus] = entero(c.total);
      }
      return {
        numero_paso: etapa.numero_paso,
        nombre: etapa.nombre,
        total: Object.values(porEstatus).reduce((suma, n) => suma + n, 0),
        por_estatus: porEstatus,
      };
    });
    return { estatus: nombres, etapas: filas };
  }

  // Etapas finalizadas con fecha de término dentro del rango (límites incluidos) y que siguen finalizadas.
  private async finalizados(
    usuario: AuthenticatedUser,
    rango: { desde: string; hasta: string },
  ): Promise<Finalizados> {
    const base = () =>
      this.etapas(usuario)
        .andWhere('es.nombre = :finalizado', { finalizado: 'Finalizado' })
        .andWhere('et.fecha_completada BETWEEN :desde AND :hasta', rango);
    const [total, lista] = await Promise.all([
      base().select('COUNT(*)', 'total').getRawOne<{ total: string }>(),
      base()
        .select(NOMBRE_CLIENTE, 'cliente')
        .addSelect('ep.numero_paso', 'numero_paso')
        .addSelect('ep.nombre', 'etapa')
        .addSelect("to_char(et.fecha_completada, 'YYYY-MM-DD')", 'fecha_completada')
        .orderBy('et.fecha_completada', 'DESC')
        .addOrderBy('c.id', 'ASC')
        .addOrderBy('ep.numero_paso', 'ASC')
        .limit(LIMITE_LISTA)
        .getRawMany<EtapaFinalizada>(),
    ]);
    return {
      total: entero(total?.total),
      lista: lista.map((f) => ({ ...f, numero_paso: Number(f.numero_paso) })),
    };
  }

  // Vencida: fecha_compromiso anterior a hoy. Por vencer: de hoy a 2 días. Sin Finalizado, Cancelado ni No aplica.
  private async vencimientos(usuario: AuthenticatedUser, hoy: string): Promise<Vencimientos> {
    const filas = await this.etapas(usuario)
      .andWhere('et.fecha_compromiso IS NOT NULL')
      .andWhere('es.nombre NOT IN (:...sinPendiente)', { sinPendiente: ESTATUS_SIN_PENDIENTE })
      .andWhere('et.fecha_compromiso <= :limite', { limite: sumarDias(hoy, DIAS_ANTES_AVISO) })
      .select(NOMBRE_CLIENTE, 'cliente')
      .addSelect('ep.numero_paso', 'numero_paso')
      .addSelect('ep.nombre', 'etapa')
      .addSelect("to_char(et.fecha_compromiso, 'YYYY-MM-DD')", 'fecha_compromiso')
      .orderBy('et.fecha_compromiso', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .addOrderBy('ep.numero_paso', 'ASC')
      .getRawMany<Omit<EtapaPorVencer, 'situacion'>>();
    const todas: EtapaPorVencer[] = filas.map((f) => ({
      ...f,
      numero_paso: Number(f.numero_paso),
      situacion: f.fecha_compromiso < hoy ? 'vencido' : 'por_vencer',
    }));
    return {
      vencidos: todas.filter((f) => f.situacion === 'vencido').length,
      por_vencer: todas.filter((f) => f.situacion === 'por_vencer').length,
      lista: todas.slice(0, LIMITE_LISTA),
    };
  }

  // Tasa de rechazo (diccionario: se cuentan las filas del historial con motivo_rechazo): cambios a Bloqueado
  // con motivo en el periodo, entre las etapas distintas con algún cambio de estatus en el periodo.
  private async rechazo(
    usuario: AuthenticatedUser,
    rango: { desde: string; hasta: string },
  ): Promise<Rechazo> {
    const motivoValido = "en.nombre = 'Bloqueado' AND btrim(COALESCE(h.motivo_rechazo, '')) <> ''";
    const base = () => {
      const qb = this.ds
        .createQueryBuilder()
        .from(EtapaTramiteHistorial, 'h')
        .innerJoin(EtapaTramite, 'et', 'et.id = h.etapa_tramite_id')
        .innerJoin(EtapaProceso, 'ep', 'ep.id = et.etapa_id')
        .innerJoin(EstatusTramite, 'en', 'en.id = h.estatus_nuevo_id')
        .innerJoin(Cliente, 'c', 'c.id = et.cliente_id')
        .where('ep.numero_paso <= :ultimaEtapa', { ultimaEtapa: ULTIMA_ETAPA })
        .andWhere(`h.fecha_cambio >= ${INICIO_PERIODO} AND h.fecha_cambio < ${FIN_PERIODO}`, rango);
      return aplicarAlcanceClientes(qb as SelectQueryBuilder<EtapaTramiteHistorial>, usuario, 'c');
    };
    const [totales, motivos] = await Promise.all([
      base()
        .select('COUNT(DISTINCT et.id)', 'etapas')
        .addSelect(`COUNT(*) FILTER (WHERE ${motivoValido})`, 'bloqueos')
        .getRawOne<{ etapas: string; bloqueos: string }>(),
      base()
        .andWhere(motivoValido)
        .select('btrim(h.motivo_rechazo)', 'motivo')
        .addSelect('COUNT(*)', 'total')
        .groupBy('btrim(h.motivo_rechazo)')
        .orderBy('COUNT(*)', 'DESC')
        .addOrderBy('btrim(h.motivo_rechazo)', 'ASC')
        .limit(LIMITE_MOTIVOS)
        .getRawMany<{ motivo: string; total: string }>(),
    ]);
    const etapas = entero(totales?.etapas);
    const bloqueos = entero(totales?.bloqueos);
    return {
      tasa: etapas > 0 ? redondear(bloqueos / etapas, 4) : 0,
      bloqueos,
      etapas_con_cambios: etapas,
      motivos: motivos.map((m) => ({ motivo: m.motivo, total: entero(m.total) })),
    };
  }

  // Clientes con fecha de ingreso dentro del rango y su distribución por régimen.
  private async clientesNuevos(
    usuario: AuthenticatedUser,
    rango: { desde: string; hasta: string },
  ): Promise<ClientesNuevos> {
    const qb = this.ds
      .createQueryBuilder()
      .from(Cliente, 'c')
      .innerJoin(RegimenPrincipal, 'r', 'r.id = c.regimen_id')
      .where('c.fecha_ingreso BETWEEN :desde AND :hasta', rango);
    const filas = await aplicarAlcanceClientes(qb as SelectQueryBuilder<Cliente>, usuario, 'c')
      .select('r.nombre', 'regimen')
      .addSelect('COUNT(*)', 'total')
      .groupBy('r.nombre')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('r.nombre', 'ASC')
      .getRawMany<{ regimen: string; total: string }>();
    const por_regimen = filas.map((f) => ({ regimen: f.regimen, total: entero(f.total) }));
    return { total: por_regimen.reduce((suma, f) => suma + f.total, 0), por_regimen };
  }

  // Solo supervisor: clientes y avance promedio (etapas 0 a 4, sin "No aplica") de cada asesor.
  private async porAsesor(usuario: AuthenticatedUser): Promise<AvanceDeAsesor[]> {
    const qb = this.ds
      .createQueryBuilder()
      .from(Cliente, 'c')
      .innerJoin(Usuario, 'u', 'u.id = c.asesor_id')
      .leftJoin(EtapaTramite, 'et', 'et.cliente_id = c.id')
      .leftJoin(EtapaProceso, 'ep', 'ep.id = et.etapa_id AND ep.numero_paso <= :ultimaEtapa', {
        ultimaEtapa: ULTIMA_ETAPA,
      })
      .leftJoin(EstatusTramite, 'es', 'es.id = et.estatus_id');
    const filas = await aplicarAlcanceClientes(qb as SelectQueryBuilder<Cliente>, usuario, 'c')
      .select('u.id', 'asesor_id')
      .addSelect("u.nombre || ' ' || u.apellido_paterno", 'asesor')
      .addSelect('COUNT(DISTINCT c.id)', 'clientes')
      .addSelect(
        "AVG(et.avance_porcentaje) FILTER (WHERE ep.id IS NOT NULL AND es.categoria <> 'no_aplica')",
        'promedio',
      )
      .groupBy('u.id')
      .addGroupBy('u.nombre')
      .addGroupBy('u.apellido_paterno')
      .orderBy('u.nombre', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .getRawMany<{
        asesor_id: string;
        asesor: string;
        clientes: string;
        promedio: string | null;
      }>();
    return filas.map((f) => ({
      asesor_id: f.asesor_id,
      asesor: f.asesor,
      clientes: entero(f.clientes),
      avance_promedio: f.promedio === null ? 0 : redondear(Number(f.promedio), 1),
    }));
  }
}
