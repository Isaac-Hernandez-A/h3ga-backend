import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventoAgenda } from '../agenda/entities/evento-agenda.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { aplicarAlcanceClientes } from '../common/auth/clientes-accesibles';
import { DIAS_ANTES_AVISO, fechaLocal, Reloj, ZONA } from '../common/fechas';
import { Cliente } from '../clientes/entities/cliente.entity';
import { EstatusTramite } from '../etapas/entities/estatus-tramite.entity';
import { EtapaTramite } from '../etapas/entities/etapa-tramite.entity';
import { ListarAvisosQueryDto } from './dto/listar-avisos-query.dto';
import { Aviso } from './entities/aviso.entity';

// Una etapa deja de generar avisos al terminar, cancelarse o no aplicar.
const ESTATUS_SIN_AVISO = "('Finalizado', 'Cancelado', 'No aplica')";

// 00:00 de Cancún del día (fecha − 2 días): la hora a la que comienza la alerta. Es la clave de unicidad.
const alertaDe = (columnaFecha: string) =>
  `(CAST(${columnaFecha} - ${DIAS_ANTES_AVISO} AS timestamp) AT TIME ZONE '${ZONA}')`;

@Injectable()
export class AvisosService {
  constructor(
    @InjectRepository(Aviso) private readonly avisos: Repository<Aviso>,
    private readonly ds: DataSource,
    private readonly reloj: Reloj,
  ) {}

  // La bandeja del usuario. Los avisos se generan aquí, al consultar (sin tarea programada, RF-28): se
  // insertan los que falten con INSERT ... ON CONFLICT DO NOTHING (índices únicos parciales de D4), así
  // que consultas repetidas o simultáneas no duplican. Devuelve solo los avisos vigentes del alcance del
  // usuario: los de una etapa o evento que ya no califica (finalizada, cancelada, compromiso movido) se omiten.
  async listar(usuario: AuthenticatedUser, filtros: ListarAvisosQueryDto): Promise<Aviso[]> {
    const ahora = this.reloj.ahora();
    await this.generarFaltantes(usuario, fechaLocal(ahora));

    const qb = this.consultaConAlcance(usuario)
      .andWhere(
        `((a.etapa_tramite_id IS NOT NULL
            AND et.fecha_compromiso IS NOT NULL
            AND est.nombre NOT IN ${ESTATUS_SIN_AVISO}
            AND a.fecha_alerta = ${alertaDe('et.fecha_compromiso')})
          OR (a.evento_id IS NOT NULL
            AND ev.estatus = 'pendiente'
            AND a.fecha_alerta = ${alertaDe('ev.fecha')}))`,
      )
      .andWhere('a.fecha_alerta <= :ahora', { ahora });
    if (filtros.atendido !== undefined) {
      qb.andWhere('a.atendido = :atendido', { atendido: filtros.atendido });
    }
    return qb.orderBy('a.fecha_alerta', 'ASC').addOrderBy('a.id', 'ASC').getMany();
  }

  async obtenerAviso(avisoId: string): Promise<Aviso> {
    throw new NotImplementedException();
  }

  // Marca el aviso como atendido por el usuario. Si ya estaba atendido conserva quién y cuándo lo hizo
  // primero (el UPDATE solo toca avisos pendientes, así que dos atenciones simultáneas no se pisan).
  async atender(usuario: AuthenticatedUser, avisoId: string): Promise<Aviso> {
    const aviso = await this.consultaConAlcance(usuario)
      .andWhere('a.id = :avisoId', { avisoId })
      .getOne();
    if (!aviso) throw new NotFoundException('Aviso no encontrado.');
    if (!aviso.atendido) {
      await this.avisos.update(
        { id: avisoId, atendido: false },
        { atendido: true, atendido_por: usuario.sub, fecha_atencion: this.reloj.ahora() },
      );
    }
    return this.avisos.findOneByOrFail({ id: avisoId });
  }

  // Avisos cuyo origen (etapa o evento) pertenece a un cliente del alcance del usuario.
  private consultaConAlcance(usuario: AuthenticatedUser) {
    const qb = this.avisos
      .createQueryBuilder('a')
      .leftJoin(EtapaTramite, 'et', 'et.id = a.etapa_tramite_id')
      .leftJoin(EstatusTramite, 'est', 'est.id = et.estatus_id')
      .leftJoin(EventoAgenda, 'ev', 'ev.id = a.evento_id')
      .innerJoin(Cliente, 'c', 'c.id = COALESCE(et.cliente_id, ev.cliente_id)');
    return aplicarAlcanceClientes(qb, usuario, 'c');
  }

  // Inserta los avisos que faltan para el alcance del usuario: etapas con compromiso (que no estén
  // Finalizado, Cancelado ni No aplica) y eventos pendientes cuya alerta ya empezó. Las filas se
  // ordenan por id para que dos generaciones simultáneas tomen los bloqueos en el mismo orden. Todas las
  // columnas del SELECT son expresiones (CAST): así TypeORM respeta el orden de la lista de INSERT.
  private async generarFaltantes(usuario: AuthenticatedUser, hoy: string): Promise<void> {
    const deEtapas = this.ds
      .createQueryBuilder()
      .select("CAST('tramite' AS tipo_aviso)", 'tipo')
      .addSelect('CAST(et.id AS uuid)', 'etapa_tramite_id')
      .addSelect(alertaDe('et.fecha_compromiso'), 'fecha_alerta')
      .from(EtapaTramite, 'et')
      .innerJoin(EstatusTramite, 'est', 'est.id = et.estatus_id')
      .innerJoin(Cliente, 'c', 'c.id = et.cliente_id')
      .where('et.fecha_compromiso IS NOT NULL')
      .andWhere(`est.nombre NOT IN ${ESTATUS_SIN_AVISO}`)
      .andWhere(`et.fecha_compromiso - ${DIAS_ANTES_AVISO} <= CAST(:hoy AS date)`, { hoy })
      .orderBy('et.id');
    aplicarAlcanceClientes(deEtapas, usuario, 'c');
    const [sqlEtapas, paramsEtapas] = deEtapas.getQueryAndParameters();
    await this.ds.query(
      `INSERT INTO avisos (tipo, etapa_tramite_id, fecha_alerta) ${sqlEtapas}
       ON CONFLICT (etapa_tramite_id, fecha_alerta) WHERE etapa_tramite_id IS NOT NULL DO NOTHING`,
      paramsEtapas,
    );

    const deEventos = this.ds
      .createQueryBuilder()
      .select("CAST('cita' AS tipo_aviso)", 'tipo')
      .addSelect('CAST(ev.id AS uuid)', 'evento_id')
      .addSelect(alertaDe('ev.fecha'), 'fecha_alerta')
      .from(EventoAgenda, 'ev')
      .innerJoin(Cliente, 'c', 'c.id = ev.cliente_id')
      .where("ev.estatus = 'pendiente'")
      .andWhere(`ev.fecha - ${DIAS_ANTES_AVISO} <= CAST(:hoy AS date)`, { hoy })
      .orderBy('ev.id');
    aplicarAlcanceClientes(deEventos, usuario, 'c');
    const [sqlEventos, paramsEventos] = deEventos.getQueryAndParameters();
    await this.ds.query(
      `INSERT INTO avisos (tipo, evento_id, fecha_alerta) ${sqlEventos}
       ON CONFLICT (evento_id, fecha_alerta) WHERE evento_id IS NOT NULL DO NOTHING`,
      paramsEventos,
    );
  }
}
