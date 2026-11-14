import { reabrirAvisoAtendido } from '../avisos/alerta';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { fechaLocal } from '../common/fechas';
import { TramitesService } from '../tramites/tramites.service';
import { CambiarEstatusDto } from './dto/cambiar-estatus.dto';
import { CreateEtapaTramiteDto } from './dto/create-etapa-tramite.dto';
import { EtapasClienteRespuesta } from './dto/etapas-cliente-respuesta.dto';
import { EstatusTramite } from './entities/estatus-tramite.entity';
import { EtapaProceso } from './entities/etapa-proceso.entity';
import { EtapaTramite } from './entities/etapa-tramite.entity';
import { EtapaTramiteHistorial } from './entities/etapa-tramite-historial.entity';
import {
  AvanceInvalidoError,
  calcularAvance,
  esReactivacion,
  NombreEstatus,
} from './reglas-avance';

@Injectable()
export class EtapasService {
  constructor(
    @InjectRepository(EstatusTramite) private readonly estatus: Repository<EstatusTramite>,
    @InjectRepository(EtapaTramite) private readonly etapas: Repository<EtapaTramite>,
    @InjectRepository(EtapaTramiteHistorial)
    private readonly historial: Repository<EtapaTramiteHistorial>,
    private readonly ds: DataSource,
    private readonly tramites: TramitesService,
  ) {}

  // Las etapas del cliente en orden de paso (0 a 15), con nombre del catálogo, y su avance global.
  async listarEtapas(clienteId: string): Promise<EtapasClienteRespuesta> {
    const [etapas, pasos, avanceGlobal] = await Promise.all([
      this.etapas.find({ where: { cliente_id: clienteId } }),
      this.ds.getRepository(EtapaProceso).find(),
      this.avanceGlobal(clienteId),
    ]);
    const porId = new Map(pasos.map((p) => [p.id, p]));
    const lista = etapas
      .map((e) => ({
        ...e,
        numero_paso: porId.get(e.etapa_id)?.numero_paso ?? -1,
        nombre: porId.get(e.etapa_id)?.nombre ?? '',
      }))
      .sort((a, b) => a.numero_paso - b.numero_paso);
    return { avance_global: avanceGlobal, etapas: lista };
  }

  async crearEtapa(clienteId: string, dto: CreateEtapaTramiteDto): Promise<EtapaTramite> {
    throw new NotImplementedException();
  }

  // Cambia el estatus y/o el avance de una etapa. La etapa y su fila de bitácora se escriben en UNA
  // transacción: si falla cualquiera de las dos, no queda ninguna. La fila de la etapa se bloquea para
  // que dos cambios simultáneos no se pisen. Solo un cambio de estatus genera fila de historial.
  async cambiarEstatus(
    usuario: AuthenticatedUser,
    clienteId: string,
    etapaTramiteId: string,
    dto: CambiarEstatusDto,
  ): Promise<EtapaTramite> {
    const nombres = new Map<number, NombreEstatus>(
      (await this.estatus.find()).map((e) => [e.id, e.nombre as NombreEstatus]),
    );

    return this.ds.transaction(async (manager) => {
      const etapa = await manager.findOne(EtapaTramite, {
        where: { id: etapaTramiteId, cliente_id: clienteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!etapa) throw new NotFoundException('Etapa no encontrada.');

      const estatusNuevoId = dto.estatus_id ?? etapa.estatus_id;
      const nuevo = nombres.get(estatusNuevoId);
      const anterior = nombres.get(etapa.estatus_id);
      if (!nuevo || !anterior) throw new BadRequestException('El estatus indicado no existe.');
      const cambiaEstatus = estatusNuevoId !== etapa.estatus_id;

      const motivo = dto.motivo_rechazo?.trim();
      if (cambiaEstatus && nuevo === 'Bloqueado' && !motivo) {
        throw new BadRequestException('Bloqueado requiere motivo_rechazo.');
      }

      const cambios: Partial<EtapaTramite> = { actualizado_el: new Date() };
      if (cambiaEstatus || dto.avance_porcentaje !== undefined) {
        try {
          cambios.avance_porcentaje = calcularAvance({
            estatusNuevo: nuevo,
            avancePrevio: etapa.avance_porcentaje,
            avanceSolicitado: dto.avance_porcentaje,
          });
        } catch (error) {
          if (error instanceof AvanceInvalidoError) throw new BadRequestException(error.message);
          throw error;
        }
      }
      if (dto.accion_a_realizar !== undefined) cambios.accion_a_realizar = dto.accion_a_realizar;
      if (dto.fecha_compromiso !== undefined) cambios.fecha_compromiso = dto.fecha_compromiso;
      if (cambiaEstatus) {
        cambios.estatus_id = estatusNuevoId;
        if (nuevo === 'Bloqueado') cambios.motivo_rechazo = motivo;
        if (nuevo === 'Finalizado') cambios.fecha_completada = fechaLocal(new Date());
        if (esReactivacion(anterior, nuevo)) cambios.reactivado_en = new Date();
      }

      await manager.update(EtapaTramite, { id: etapa.id }, cambios);
      // Un compromiso movido a un día cuya alerta ya existía y estaba atendida la deja pendiente otra vez.
      if (dto.fecha_compromiso && dto.fecha_compromiso !== etapa.fecha_compromiso) {
        await reabrirAvisoAtendido(manager, { etapaTramiteId: etapa.id }, dto.fecha_compromiso);
      }
      if (cambiaEstatus) {
        await manager.insert(EtapaTramiteHistorial, {
          etapa_tramite_id: etapa.id,
          estatus_anterior_id: etapa.estatus_id,
          estatus_nuevo_id: estatusNuevoId,
          motivo_rechazo: nuevo === 'Bloqueado' ? (motivo ?? null) : null,
          cambiado_por: usuario.sub,
          fecha_cambio: new Date(),
        });
      }
      // D2: al finalizar la etapa 2 (corrección de datos personales) las correcciones F2 se copian al
      // expediente, dentro de esta misma transacción.
      if (cambiaEstatus && nuevo === 'Finalizado') {
        const paso = await manager.findOneByOrFail(EtapaProceso, { id: etapa.etapa_id });
        if (paso.numero_paso === 2) {
          await this.tramites.aplicarCorreccionesAlExpediente(manager, clienteId);
        }
      }
      return manager.findOneByOrFail(EtapaTramite, { id: etapa.id });
    });
  }

  // Promedio simple del avance de las etapas del cliente, sin contar las No aplica (categoría
  // no_aplica). Sin etapas que cuenten, 0. Se redondea al entero más cercano.
  async avanceGlobal(clienteId: string): Promise<number> {
    const filas = await this.ds.query<{ promedio: string | null }[]>(
      `SELECT AVG(et.avance_porcentaje) AS promedio
         FROM etapas_tramite et
         JOIN estatus_tramite es ON es.id = et.estatus_id
        WHERE et.cliente_id = $1 AND es.categoria <> 'no_aplica'`,
      [clienteId],
    );
    return Math.round(Number(filas[0]?.promedio ?? 0));
  }

  // Solo lectura: el historial es una bitácora y no se modifica ni se elimina por ninguna vía.
  async listarHistorial(
    clienteId: string,
    etapaTramiteId: string,
  ): Promise<EtapaTramiteHistorial[]> {
    const existe = await this.etapas.exists({
      where: { id: etapaTramiteId, cliente_id: clienteId },
    });
    if (!existe) throw new NotFoundException('Etapa no encontrada.');
    return this.historial.find({
      where: { etapa_tramite_id: etapaTramiteId },
      order: { fecha_cambio: 'ASC', id: 'ASC' },
    });
  }

  async listarCatalogoEtapas(): Promise<EtapaProceso[]> {
    throw new NotImplementedException();
  }

  // Catálogo: la lista completa de la tabla, ordenada por id.
  listarEstatus(): Promise<EstatusTramite[]> {
    return this.estatus.find({ order: { id: 'ASC' } });
  }
}
