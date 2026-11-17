import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ClientesService } from '../clientes/clientes.service';
import { CreateClienteDto } from '../clientes/dto/create-cliente.dto';
import { DatosCliente, RenglonValidado } from './tipos';

// Cargador por lotes (Actividad 5, Tarea 9). Cada lote es una transacción: o se guardan todos sus clientes
// o ninguno. Si un lote falla se revierte y se reintenta renglón por renglón (lote "degradado"): los buenos
// se cargan y los que la base rechaza se reportan con su motivo.
//
// Cada cliente se crea con ClientesService.crear dentro de la transacción del lote (que crea las 16
// etapas en "Por iniciar") y después se escribe directo en cada etapa el estatus, avance, acción y fecha
// compromiso del Excel. No se usa EtapasService.cambiarEstatus: no hay historial y fecha_completada queda
// en NULL.
//
// El ejecutor (Supervisor) solo consta en los logs y en el reporte: clientes no tiene columna de "creado
// por". Los logs y los motivos NUNCA incluyen CURP, NSS ni el texto de los errores de la base (que puede
// citar el valor repetido): solo filas y mensajes fijos.
export interface OpcionesCarga {
  tamanoLote: number;
  simulacro: boolean;
  // Usuario (Supervisor) que ejecuta la importación.
  ejecutorId: string;
}

export interface ResultadoCarga {
  cargados: string[]; // CURP de los clientes cargados, en el orden de entrada
  rechazados: { fila: number; motivo: string }[];
  lotes: number;
  lotesDegradados: number;
}

// Un renglón que no se puede guardar por una razón conocida; su mensaje es seguro para el reporte.
class ErrorDeCarga extends Error {}

interface Catalogos {
  regimen: Map<string, number>;
  ley: Map<string, number>;
  afore: Map<string, number>;
  estatus: Map<string, number>;
  etapas: Map<number, number>; // numero_paso a etapas_proceso.id
}

const fechaIso = (fecha: Date) => fecha.toISOString().slice(0, 10);

@Injectable()
export class CargadorClientes {
  private readonly logger = new Logger(CargadorClientes.name);

  constructor(
    private readonly ds: DataSource,
    private readonly clientes: ClientesService,
  ) {}

  async cargarLotes(validos: RenglonValidado[], opciones: OpcionesCarga): Promise<ResultadoCarga> {
    const { tamanoLote, simulacro, ejecutorId } = opciones;
    if (!Number.isInteger(tamanoLote) || tamanoLote < 1) {
      throw new Error('El tamaño de lote debe ser un entero positivo.');
    }
    const resultado: ResultadoCarga = {
      cargados: [],
      rechazados: [],
      lotes: 0,
      lotesDegradados: 0,
    };
    if (validos.length === 0) return resultado;
    if (validos.some((r) => r.datos === null)) {
      throw new Error('cargarLotes recibe solo renglones válidos.');
    }
    this.logger.log(
      `Carga${simulacro ? ' (simulacro)' : ''} iniciada por el ejecutor ${ejecutorId}: ${validos.length} renglones, lotes de ${tamanoLote}.`,
    );

    const catalogos = simulacro ? null : await this.leerCatalogos();
    for (let i = 0; i < validos.length; i += tamanoLote) {
      const lote = validos.slice(i, i + tamanoLote);
      resultado.lotes++;
      if (catalogos === null) {
        resultado.cargados.push(...lote.map((r) => r.datos!.curp));
        continue;
      }
      try {
        await this.ds.transaction(async (manager) => {
          for (const renglon of lote)
            await this.guardar(manager, renglon.datos!, catalogos, ejecutorId);
        });
        resultado.cargados.push(...lote.map((r) => r.datos!.curp));
      } catch {
        // La transacción del lote ya se revirtió: se reintenta cada renglón con la suya.
        resultado.lotesDegradados++;
        this.logger.warn(
          `Lote ${resultado.lotes} revertido (ejecutor ${ejecutorId}); se reintenta renglón por renglón.`,
        );
        for (const renglon of lote) {
          try {
            await this.ds.transaction((manager) =>
              this.guardar(manager, renglon.datos!, catalogos, ejecutorId),
            );
            resultado.cargados.push(renglon.datos!.curp);
          } catch (error) {
            const motivo = motivoDe(error);
            resultado.rechazados.push({ fila: renglon.fila, motivo });
            this.logger.warn(`Renglón de la fila ${renglon.fila} rechazado: ${motivo}`);
          }
        }
      }
    }
    this.logger.log(
      `Carga${simulacro ? ' (simulacro)' : ''} terminada (ejecutor ${ejecutorId}): ${resultado.cargados.length} cargados, ${resultado.rechazados.length} rechazados, ${resultado.lotes} lotes, ${resultado.lotesDegradados} degradados.`,
    );
    return resultado;
  }

  private async leerCatalogos(): Promise<Catalogos> {
    const porNombre = async (tabla: string) =>
      new Map(
        (
          await this.ds.query<{ id: number; nombre: string }[]>(`SELECT id, nombre FROM ${tabla}`)
        ).map((f) => [f.nombre, f.id] as [string, number]),
      );
    const etapas = await this.ds.query<{ id: number; numero_paso: number }[]>(
      `SELECT id, numero_paso FROM etapas_proceso`,
    );
    return {
      regimen: await porNombre('regimen_principal'),
      ley: await porNombre('ley_probable'),
      afore: await porNombre('afore'),
      estatus: await porNombre('estatus_tramite'),
      etapas: new Map(etapas.map((e) => [e.numero_paso, e.id] as [number, number])),
    };
  }

  // Crea el cliente (con sus 16 etapas en "Por iniciar") y deja cada etapa como la trae el Excel, todo
  // dentro de la transacción recibida.
  private async guardar(
    manager: EntityManager,
    d: DatosCliente,
    catalogos: Catalogos,
    ejecutorId: string,
  ): Promise<void> {
    const id = (mapa: Map<string, number>, nombre: string, que: string) => {
      const valor = mapa.get(nombre);
      if (valor === undefined) throw new ErrorDeCarga(`${que} no existe en el sistema.`);
      return valor;
    };
    // Todo lo que pueda faltar se resuelve antes de tocar la base.
    const regimenId = id(catalogos.regimen, d.regimen, 'El régimen');
    const leyId = id(catalogos.ley, d.leyProbable, 'La ley probable');
    const aforeId = id(catalogos.afore, d.afore, 'La AFORE');
    const etapas = d.etapas.map((e) => ({
      etapaId: catalogos.etapas.get(e.numeroPaso),
      estatusId: catalogos.estatus.get(e.estatus),
      e,
    }));
    for (const { etapaId, estatusId, e } of etapas) {
      if (etapaId === undefined)
        throw new ErrorDeCarga(`La etapa ${e.numeroPaso} no existe en el sistema.`);
      if (estatusId === undefined) {
        throw new ErrorDeCarga(
          `La etapa ${e.numeroPaso} trae un estatus que no existe en el sistema.`,
        );
      }
    }

    const dto = {
      nombre: d.nombre,
      apellido_paterno: d.apellidoPaterno,
      apellido_materno: d.apellidoMaterno,
      referido_por: d.referidoPor,
      telefono: d.telefono,
      fecha_ingreso: fechaIso(d.fechaIngreso),
      correo_electronico: d.correoElectronico,
      curp: d.curp,
      rfc: d.rfc ?? undefined,
      fecha_nacimiento: fechaIso(d.fechaNacimiento),
      estado_civil: d.estadoCivil,
      dependientes_economicos: d.dependientesEconomicos,
      regimen_id: regimenId,
      nss: d.nss ?? undefined,
      ley_probable_id: leyId,
      semanas_imss_reconocidas: d.semanasImssReconocidas,
      semanas_a_recuperar: d.semanasARecuperar ?? undefined,
      tiene_issste: d.tieneIssste,
      afore_id: aforeId,
      observaciones_generales: d.observacionesGenerales,
      requiere_contadora: d.requiereContadora,
      sexo: d.sexo,
      domicilio: d.domicilio,
      estado: d.estado,
      subdelegacion_imss_probable: d.subdelegacionImssProbable,
      cambio_afore: d.cambioAfore,
      objetivo_cliente: d.objetivoCliente,
    } as unknown as CreateClienteDto;

    const cliente = await this.clientes.crear({ sub: ejecutorId, rol: 'supervisor' }, dto, {
      manager,
      asesorId: d.asesorId,
    });

    await manager.query(
      `UPDATE etapas_tramite t
          SET estatus_id = v.estatus_id, avance_porcentaje = v.avance,
              accion_a_realizar = v.accion, fecha_compromiso = v.fecha::date,
              motivo_rechazo = v.motivo
         FROM unnest($2::smallint[], $3::smallint[], $4::smallint[], $5::text[], $6::text[], $7::text[])
              AS v(etapa_id, estatus_id, avance, accion, fecha, motivo)
        WHERE t.cliente_id = $1 AND t.etapa_id = v.etapa_id`,
      [
        cliente.id,
        etapas.map((x) => x.etapaId),
        etapas.map((x) => x.estatusId),
        // Sin avance (No aplica) se guarda 0: la columna es NOT NULL.
        etapas.map((x) => x.e.avance ?? 0),
        etapas.map((x) => x.e.accion),
        etapas.map((x) => (x.e.fechaCompromiso ? fechaIso(x.e.fechaCompromiso) : null)),
        etapas.map((x) => x.e.motivoRechazo),
      ],
    );
  }
}

// Motivo seguro para el reporte: nunca el texto del error de la base.
function motivoDe(error: unknown): string {
  if (error instanceof ErrorDeCarga) return error.message;
  if (error instanceof ConflictException) return 'Ya existe un cliente con esa CURP.';
  return 'La base de datos rechazó el renglón.';
}
