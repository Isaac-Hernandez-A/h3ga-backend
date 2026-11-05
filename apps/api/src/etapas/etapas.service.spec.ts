import { randomUUID } from 'node:crypto';
import { DiscoveryService, ModulesContainer } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarEtapa,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { EtapasService } from './etapas.service';

// Servicio contra la base de pruebas real: la atomicidad se prueba con restricciones reales de PostgreSQL.
jest.setTimeout(60_000);

describeConBd('EtapasService (base de pruebas)', () => {
  let ctx: AppConBd;
  let servicio: EtapasService;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;

  const usuario = () => ({ sub: asesor.id, rol: asesor.rol });
  const etapa = (id: string) =>
    ctx.ds
      .query<{ estatus_id: number; avance_porcentaje: number }[]>(
        'SELECT estatus_id, avance_porcentaje FROM etapas_tramite WHERE id = $1',
        [id],
      )
      .then((f) => f[0]);
  const historial = (id: string) =>
    ctx.ds.query<
      {
        estatus_anterior_id: number | null;
        estatus_nuevo_id: number;
        cambiado_por: string;
        motivo_rechazo: string | null;
        fecha_cambio: Date;
      }[]
    >('SELECT * FROM etapas_tramite_historial WHERE etapa_tramite_id = $1 ORDER BY fecha_cambio', [
      id,
    ]);

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    servicio = ctx.app.get(EtapasService);
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-24 cada cambio inserta una fila de historial con estatus anterior y nuevo, usuario y fecha', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, 2, ID_ESTATUS['Por iniciar'], 10);

    const antes = Date.now();
    await servicio.cambiarEstatus(usuario(), clienteId, etapaId, {
      estatus_id: ID_ESTATUS['En proceso asesor'],
      avance_porcentaje: 40,
    });
    await servicio.cambiarEstatus(usuario(), clienteId, etapaId, {
      estatus_id: ID_ESTATUS.Finalizado,
    });

    const filas = await historial(etapaId);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({
      estatus_anterior_id: ID_ESTATUS['Por iniciar'],
      estatus_nuevo_id: ID_ESTATUS['En proceso asesor'],
      cambiado_por: asesor.id,
    });
    expect(filas[1]).toMatchObject({
      estatus_anterior_id: ID_ESTATUS['En proceso asesor'],
      estatus_nuevo_id: ID_ESTATUS.Finalizado,
      cambiado_por: asesor.id,
    });
    expect(new Date(filas[0].fecha_cambio).getTime()).toBeGreaterThanOrEqual(antes - 5000);
    expect(await etapa(etapaId)).toEqual({
      estatus_id: ID_ESTATUS.Finalizado,
      avance_porcentaje: 100,
    });
  });

  it('un cambio que no modifica el estatus (solo el avance) no inserta historial', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, 3, ID_ESTATUS['En proceso asesor'], 30);
    await servicio.cambiarEstatus(usuario(), clienteId, etapaId, { avance_porcentaje: 60 });
    expect(await etapa(etapaId)).toEqual({
      estatus_id: ID_ESTATUS['En proceso asesor'],
      avance_porcentaje: 60,
    });
    expect(await historial(etapaId)).toHaveLength(0);
  });

  it('CP-25 si falla el insert del historial, la etapa conserva estatus y avance (rollback)', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    const etapaId = await insertarEtapa(ctx.ds, clienteId, 4, ID_ESTATUS['En proceso asesor'], 40);

    // cambiado_por referencia usuarios.id: un usuario que no existe hace fallar el SEGUNDO paso
    // (el insert del historial) después de que la etapa ya se actualizó dentro de la transacción.
    const fantasma = { sub: randomUUID(), rol: 'asesor' as const };
    await expect(
      servicio.cambiarEstatus(fantasma, clienteId, etapaId, { estatus_id: ID_ESTATUS.Finalizado }),
    ).rejects.toBeDefined();

    expect(await etapa(etapaId)).toEqual({
      estatus_id: ID_ESTATUS['En proceso asesor'],
      avance_porcentaje: 40,
    });
    expect(await historial(etapaId)).toHaveLength(0);
    const fila = await ctx.ds.query<{ fecha_completada: string | null }[]>(
      'SELECT fecha_completada FROM etapas_tramite WHERE id = $1',
      [etapaId],
    );
    expect(fila[0].fecha_completada).toBeNull();
  });

  it('CP-26 no existe ruta ni método que modifique o elimine el historial', () => {
    // Todas las rutas reales del router: las del historial de etapas (no el historial laboral) solo son GET.
    const rutas: { metodo: number; ruta: string }[] = [];
    for (const { metatype } of new DiscoveryService(
      ctx.app.get(ModulesContainer),
    ).getControllers()) {
      if (!metatype) continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, metatype) ?? '');
      for (const nombre of Object.getOwnPropertyNames(metatype.prototype)) {
        const manejador = metatype.prototype[nombre] as object;
        const metodo = Reflect.getMetadata(METHOD_METADATA, manejador) as number | undefined;
        if (metodo === undefined) continue;
        rutas.push({
          metodo,
          ruta: `${base}/${String(Reflect.getMetadata(PATH_METADATA, manejador))}`,
        });
      }
    }
    const delHistorial = rutas.filter((r) => /etapas\/:[^/]+\/historial/.test(r.ruta));
    expect(delHistorial.length).toBeGreaterThan(0);
    expect(delHistorial.every((r) => r.metodo === RequestMethod.GET)).toBe(true);

    // Y el servicio no ofrece métodos de escritura sobre el historial.
    const metodosServicio = Object.getOwnPropertyNames(EtapasService.prototype);
    expect(metodosServicio.filter((m) => /historial/i.test(m) && !/^listar/.test(m))).toEqual([]);
  });

  it('CP-27 avanceGlobal excluye las etapas No aplica', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    expect(await servicio.avanceGlobal(clienteId)).toBe(0);
    await insertarEtapa(ctx.ds, clienteId, 0, ID_ESTATUS['Por iniciar'], 10);
    await insertarEtapa(ctx.ds, clienteId, 1, ID_ESTATUS.Finalizado, 100);
    await insertarEtapa(ctx.ds, clienteId, 2, ID_ESTATUS['No aplica'], 0);
    // (10 + 100) / 2 = 55: la etapa No aplica no cuenta ni en el numerador ni en el denominador.
    expect(await servicio.avanceGlobal(clienteId)).toBe(55);
  });
});
