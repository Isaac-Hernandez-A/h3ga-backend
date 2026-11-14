import { randomUUID } from 'node:crypto';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarDiagnosticoF1,
  insertarEtapa,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Módulo «Correcciones» del frontend: GET /correcciones (resumen por cliente de las etapas 2, 3 y 4) y las
// dos lecturas de la unificación de NSS. Aplicación real y base de pruebas; solo datos ficticios.
jest.setTimeout(120_000);

interface Fase {
  numero_paso: number;
  etapa_tramite_id: string | null;
  estatus_id: number | null;
  estatus: string | null;
  avance_porcentaje: number;
  fecha_compromiso: string | null;
  accion_a_realizar: string | null;
  requiere: boolean;
  correcciones: number | null;
  documentos_cargados: number | null;
}
interface Fila {
  cliente_id: string;
  cliente_nombre: string;
  actualizado_el: string;
  fases: Fase[];
}
interface Listado {
  resumen: { clientes_con_correcciones: number; documentos_por_subir: number };
  clientes: Fila[];
}

describeConBd('Correcciones: listado y unificación de NSS (aplicación real)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  let supervisor: UsuarioPrueba;
  let tipoNss: number;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);

  async function pedir(metodo: string, ruta: string, token?: string, datos?: object) {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { 'Content-Type': 'application/json' } : {}),
      },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: texto ? JSON.parse(texto) : null };
  }
  const listado = async (u: UsuarioPrueba) => {
    const r = await pedir('GET', '/correcciones', t(u));
    expect(r.estado).toBe(200);
    return r.json as Listado;
  };
  const etapaDe = (clienteId: string, paso: number) =>
    ctx.ds
      .query<{ id: string }[]>(
        `SELECT et.id FROM etapas_tramite et JOIN etapas_proceso ep ON ep.id = et.etapa_id
         WHERE et.cliente_id = $1 AND ep.numero_paso = $2`,
        [clienteId, paso],
      )
      .then((f) => f[0].id);
  const fijarActualizado = (clienteId: string, cuando: string) =>
    ctx.ds.query(`UPDATE etapas_tramite SET actualizado_el = $2 WHERE cliente_id = $1`, [
      clienteId,
      cuando,
    ]);
  const nombreDe = async (id: string) =>
    (
      await ctx.ds.query<{ n: string }[]>(
        `SELECT concat_ws(' ', nombre, apellido_paterno, apellido_materno) AS n FROM clientes WHERE id = $1`,
        [id],
      )
    )[0].n;

  const NSS = 'Unificación de NSS (Duplicidad / Multiplicidad)';
  const DOC_NSS =
    'Certificación de regularización y/o corrección de datos personales del asegurado (IMSS)';
  const DOC_CONSTANCIA = 'Constancia de Aclaración de Semanas Cotizadas (IMSS)';
  const DOC_REINTEGRO = 'Solicitud de Reintegro de Recursos (AFORE)';
  // Corrección registrada directamente en la base: por nombre de tipo (el id 7 es la unificación de NSS).
  const sembrarCorreccion = (clienteId: string, tipo: string) =>
    ctx.ds.query(
      `INSERT INTO correcciones_cliente (cliente_id, tipo_correccion_id)
       SELECT $1, id FROM tipo_correccion WHERE nombre = $2`,
      [clienteId, tipo],
    );
  const sembrarF1 = async (
    clienteId: string,
    asesorId: string,
    aplica: 'si' | 'no' | 'requiere_mas_evidencia' | null,
  ) => {
    const diagnostico = await insertarDiagnosticoF1(ctx.ds, clienteId, asesorId);
    if (aplica) {
      await ctx.ds.query(
        `INSERT INTO analisis_recuperacion_semanas (diagnostico_id, aplica) VALUES ($1, $2)`,
        [diagnostico, aplica],
      );
    }
  };
  const sembrarDocumento = (clienteId: string, tipo: string, subidoPor: UsuarioPrueba) =>
    ctx.ds.query(
      `INSERT INTO documentos_clientes (cliente_id, tipo_documento_id, archivo_path, nombre_archivo_original,
         mime_type, estatus, fecha_carga, subido_por)
       SELECT $1, id, 'ficticio/ruta.pdf', 'ruta.pdf', 'application/pdf', 'por_confirmar', now(), $3
       FROM tipo_documento WHERE nombre = $2`,
      [clienteId, tipo, subidoPor.id],
    );
  // Cliente que requiere la fase F2 (una corrección que no es de unificación de NSS).
  const clienteConF2 = async (dueno: UsuarioPrueba) => {
    const id = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarCorreccion(id, 'Corrección de CURP');
    return id;
  };

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
    [{ id: tipoNss }] = await ctx.ds.query(
      `SELECT id FROM tipo_correccion WHERE nombre = 'Unificación de NSS (Duplicidad / Multiplicidad)'`,
    );
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-174 GET /correcciones: solo el asesor (auxiliar y supervisor 403, sin token 401) y solo sus clientes que requieren una fase', async () => {
    const mio = await clienteConF2(asesor);
    const ajeno = await clienteConF2(otroAsesor);
    const sinFase = await insertarCliente(ctx.ds, catalogo, asesor.id);
    await autorizarEnBd(ctx.ds, mio, auxiliar.id, asesor.id, true);

    const l = await listado(asesor);
    expect(l.clientes.map((c) => c.cliente_id)).toEqual([mio]);
    expect(l.clientes.map((c) => c.cliente_id)).not.toContain(sinFase);
    expect(l.clientes[0].cliente_nombre).toBe(await nombreDe(mio));
    expect((await listado(otroAsesor)).clientes.map((c) => c.cliente_id)).toEqual([ajeno]);

    expect((await pedir('GET', '/correcciones', t(auxiliar))).estado).toBe(403);
    expect((await pedir('GET', '/correcciones', t(supervisor))).estado).toBe(403);
    expect((await pedir('GET', '/correcciones')).estado).toBe(401);
  });

  it('CP-175 reglas de requiere: F2 con correcciones que no son de tipo NSS, F3 con una de tipo NSS, F4 con análisis aplica si o requiere_mas_evidencia', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const nuevo = () => insertarCliente(ctx.ds, catalogo, dueno.id);
    const soloF2 = await nuevo();
    await sembrarCorreccion(soloF2, 'Corrección de CURP');
    await sembrarCorreccion(soloF2, 'Corrección de RFC');
    const soloF3 = await nuevo();
    await sembrarCorreccion(soloF3, NSS);
    const f2yF3 = await nuevo();
    await sembrarCorreccion(f2yF3, NSS);
    await sembrarCorreccion(f2yF3, 'Otro');
    const f4Si = await nuevo();
    await sembrarF1(f4Si, dueno.id, 'si');
    const f4Evidencia = await nuevo();
    await sembrarF1(f4Evidencia, dueno.id, 'requiere_mas_evidencia');
    const f4No = await nuevo();
    await sembrarF1(f4No, dueno.id, 'no');
    const f4SinAnalisis = await nuevo();
    await sembrarF1(f4SinAnalisis, dueno.id, null);
    const sinDiagnostico = await nuevo();
    const todas = await nuevo();
    await sembrarCorreccion(todas, 'Corrección de Domicilio');
    await sembrarCorreccion(todas, NSS);
    await sembrarF1(todas, dueno.id, 'si');

    const l = await listado(dueno);
    const por = (id: string) => l.clientes.find((c) => c.cliente_id === id);
    const reqs = (id: string) => por(id)!.fases.map((f) => f.requiere);
    expect(reqs(soloF2)).toEqual([true, false, false]);
    expect(reqs(soloF3)).toEqual([false, true, false]);
    expect(reqs(f2yF3)).toEqual([true, true, false]);
    expect(reqs(f4Si)).toEqual([false, false, true]);
    expect(reqs(f4Evidencia)).toEqual([false, false, true]);
    expect(reqs(todas)).toEqual([true, true, true]);
    // F1 con análisis «no», sin análisis o sin diagnóstico: no requiere nada, no aparece.
    for (const id of [f4No, f4SinAnalisis, sinDiagnostico]) expect(por(id)).toBeUndefined();
    expect(l.clientes).toHaveLength(6);
    // correcciones: solo F2 y sin contar las de tipo NSS; null en F3 y F4.
    expect(por(soloF2)!.fases.map((f) => f.correcciones)).toEqual([2, null, null]);
    expect(por(f2yF3)!.fases.map((f) => f.correcciones)).toEqual([1, null, null]);
    expect(por(soloF3)!.fases.map((f) => f.correcciones)).toEqual([0, null, null]);
  });

  it('CP-176 documentos_cargados: F3 cuenta el tipo de certificación; F4 cuenta constancia de aclaración y solicitud de reintegro; F2 es null', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const id = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarCorreccion(id, NSS);
    await sembrarCorreccion(id, 'Corrección de CURP');
    await sembrarF1(id, dueno.id, 'si');
    const docs = (l: Listado) => l.clientes[0].fases.map((f) => f.documentos_cargados);
    expect(docs(await listado(dueno))).toEqual([null, 0, 0]);

    await sembrarDocumento(id, DOC_NSS, dueno);
    await sembrarDocumento(id, DOC_NSS, dueno);
    await sembrarDocumento(id, DOC_CONSTANCIA, dueno);
    await sembrarDocumento(id, DOC_REINTEGRO, dueno);
    await sembrarDocumento(id, DOC_REINTEGRO, dueno);
    await sembrarDocumento(id, DOC_REINTEGRO, dueno);
    // Otros tipos de documento no cuentan.
    await sembrarDocumento(id, 'CURP', dueno);
    await sembrarDocumento(id, 'Constancia de Semanas Cotizadas (IMSS)', dueno);
    expect(docs(await listado(dueno))).toEqual([null, 2, 4]);
  });

  it('CP-177 cada cliente trae las 3 fases en orden con sus campos de etapa; sin la etapa: estatus null y avance 0; orden por actualizado_el', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const completo = await clienteConF2(dueno);
    const sinEtapas34 = await clienteConF2(dueno);
    const sinNada = await insertarCliente(ctx.ds, catalogo, dueno.id, {
      fecha_ingreso: '2026-03-10',
    });
    await sembrarCorreccion(sinNada, 'Corrección de RFC');
    await insertarEtapa(ctx.ds, completo, 2, ID_ESTATUS['En proceso asesor'], 40);
    await insertarEtapa(ctx.ds, completo, 3, ID_ESTATUS.Bloqueado, 20);
    await insertarEtapa(ctx.ds, completo, 4, ID_ESTATUS.Finalizado, 100);
    await insertarEtapa(ctx.ds, completo, 5, ID_ESTATUS['Por iniciar'], 0); // fuera de 2 a 4
    await insertarEtapa(ctx.ds, sinEtapas34, 2, ID_ESTATUS['Por iniciar'], 10);
    await ctx.ds.query(
      `UPDATE etapas_tramite SET fecha_compromiso = '2026-12-01', accion_a_realizar = 'Pedir acta'
       WHERE id = $1`,
      [await etapaDe(completo, 2)],
    );
    await fijarActualizado(completo, '2026-11-01T10:00:00-05:00');
    await ctx.ds.query(`UPDATE etapas_tramite SET actualizado_el = $2 WHERE id = $1`, [
      await etapaDe(completo, 4),
      '2026-11-10T10:00:00-05:00',
    ]);
    // La etapa 5 es más reciente, pero no cuenta.
    await ctx.ds.query(`UPDATE etapas_tramite SET actualizado_el = $2 WHERE id = $1`, [
      await etapaDe(completo, 5),
      '2026-11-30T10:00:00-05:00',
    ]);
    await fijarActualizado(sinEtapas34, '2026-11-05T10:00:00-05:00');

    const l = await listado(dueno);
    expect(l.clientes.map((c) => c.cliente_id)).toEqual([completo, sinEtapas34, sinNada]);
    expect(l.clientes.map((c) => c.fases.map((f) => f.numero_paso))).toEqual([
      [2, 3, 4],
      [2, 3, 4],
      [2, 3, 4],
    ]);
    expect(new Date(l.clientes[0].actualizado_el).toISOString()).toBe('2026-11-10T15:00:00.000Z');
    expect(new Date(l.clientes[1].actualizado_el).toISOString()).toBe('2026-11-05T15:00:00.000Z');

    const [f2, f3, f4] = l.clientes[0].fases;
    expect(f2).toEqual({
      numero_paso: 2,
      etapa_tramite_id: await etapaDe(completo, 2),
      estatus_id: ID_ESTATUS['En proceso asesor'],
      estatus: 'En proceso asesor',
      avance_porcentaje: 40,
      fecha_compromiso: '2026-12-01',
      accion_a_realizar: 'Pedir acta',
      requiere: true,
      correcciones: 1,
      documentos_cargados: null,
    });
    expect(f3).toMatchObject({ estatus: 'Bloqueado', avance_porcentaje: 20, requiere: false });
    expect(f4).toMatchObject({ estatus: 'Finalizado', avance_porcentaje: 100, requiere: false });

    // Cliente sin etapas 3 y 4: la fase existe con estatus null y avance 0.
    expect(l.clientes[1].fases[1]).toEqual({
      numero_paso: 3,
      etapa_tramite_id: null,
      estatus_id: null,
      estatus: null,
      avance_porcentaje: 0,
      fecha_compromiso: null,
      accion_a_realizar: null,
      requiere: false,
      correcciones: null,
      documentos_cargados: 0,
    });
    // Sin ninguna etapa: actualizado_el es la fecha de ingreso (00:00 de Cancún).
    expect(
      l.clientes[2].fases.every((f) => f.estatus_id === null && f.avance_porcentaje === 0),
    ).toBe(true);
    expect(new Date(l.clientes[2].actualizado_el).toISOString()).toBe('2026-03-10T05:00:00.000Z');
  });

  it('CP-185 resumen: clientes_con_correcciones y documentos_por_subir (fases F3 o F4 requeridas sin documentos); sin tramites_*', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const a = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarCorreccion(a, NSS); // F3 sin documento: por subir
    await sembrarF1(a, dueno.id, 'si'); // F4 sin documento: por subir
    const b = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarCorreccion(b, NSS); // F3 con documento: no cuenta
    await sembrarDocumento(b, DOC_NSS, dueno);
    const c = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarF1(c, dueno.id, 'requiere_mas_evidencia'); // F4 sin documento: por subir
    const d = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarCorreccion(d, 'Corrección de CURP'); // solo F2: no necesita documentos
    const e = await insertarCliente(ctx.ds, catalogo, dueno.id);
    await sembrarF1(e, dueno.id, 'si'); // F4 con un documento: no cuenta
    await sembrarDocumento(e, DOC_CONSTANCIA, dueno);
    await insertarCliente(ctx.ds, catalogo, dueno.id); // no requiere nada

    const r = await pedir('GET', '/correcciones', t(dueno));
    expect(r.json.resumen).toEqual({ clientes_con_correcciones: 5, documentos_por_subir: 3 });
    expect(Object.keys(r.json.resumen)).not.toContain('tramites_registrados');
    expect(Object.keys(r.json.resumen)).not.toContain('tramites_abiertos');
    expect(await listado(await crearUsuarioPrueba(ctx.ds, 'asesor'))).toEqual({
      resumen: { clientes_con_correcciones: 0, documentos_por_subir: 0 },
      clientes: [],
    });
  });

  it('CP-186 máximo 500 filas, las más recientes primero; el resumen cuenta todos los clientes que cumplen', async () => {
    const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
    for (let i = 0; i < 503; i++) {
      const c = await insertarCliente(ctx.ds, catalogo, dueno.id);
      await sembrarCorreccion(c, NSS);
    }
    const l = await listado(dueno);
    expect(l.clientes).toHaveLength(500);
    expect(l.resumen).toEqual({ clientes_con_correcciones: 503, documentos_por_subir: 503 });
    const instantes = l.clientes.map((c) => new Date(c.actualizado_el).getTime());
    expect([...instantes].sort((x, y) => y - x)).toEqual(instantes);
  });

  it('CP-187 sin N+1: el número de consultas de GET /correcciones no crece con los clientes', async () => {
    const pocos = await crearUsuarioPrueba(ctx.ds, 'asesor');
    const muchos = await crearUsuarioPrueba(ctx.ds, 'asesor');
    await clienteConF2(pocos);
    for (let i = 0; i < 15; i++) {
      const c = await clienteConF2(muchos);
      await sembrarCorreccion(c, NSS);
      await sembrarF1(c, muchos.id, 'si');
      await sembrarDocumento(c, DOC_NSS, muchos);
      await insertarEtapa(ctx.ds, c, 3, ID_ESTATUS['En proceso asesor'], 10);
    }
    const proto = Object.getPrototypeOf(ctx.ds.createQueryRunner());
    const espia = jest.spyOn(proto, 'query');
    await listado(pocos);
    const conUno = espia.mock.calls.length;
    espia.mockClear();
    const grande = await listado(muchos);
    const conQuince = espia.mock.calls.length;
    espia.mockRestore();
    expect(grande.clientes).toHaveLength(15);
    expect(conUno).toBeGreaterThan(0);
    expect(conQuince).toBe(conUno);
  });

  describe('Unificación de NSS: lecturas', () => {
    async function conCorreccion(dueno: UsuarioPrueba = asesor) {
      const clienteId = await insertarCliente(ctx.ds, catalogo, dueno.id);
      const r = await pedir('POST', `/clientes/${clienteId}/correcciones`, t(dueno), {
        tipo_correccion_id: tipoNss,
      });
      expect(r.estado).toBe(201);
      const base = `/clientes/${clienteId}/correcciones/${r.json.id as string}/unificacion-nss`;
      return { clienteId, correccionId: r.json.id as string, base };
    }

    it('CP-179 GET detalle: con datos devuelve nss_principal_elegido, criterio_seleccion y etapa_institucional_actual', async () => {
      const { base, correccionId } = await conCorreccion();
      const datos = {
        nss_principal_elegido: '12345678901',
        criterio_seleccion: 'antiguedad',
        etapa_institucional_actual: 'dictaminacion_imss',
      };
      expect((await pedir('PUT', base, t(asesor), datos)).estado).toBe(200);
      const r = await pedir('GET', base, t(asesor));
      expect(r.estado).toBe(200);
      expect(r.json).toMatchObject({ ...datos, correccion_id: correccionId });
      expect(r.json.id).toEqual(expect.any(String));
    });

    it('CP-180 GET detalle: sin detalle, corrección inexistente o de otro cliente responde 404; roles y alcance', async () => {
      const { base, clienteId } = await conCorreccion();
      const sin = await pedir('GET', base, t(asesor));
      expect(sin.estado).toBe(404);
      expect(JSON.stringify(sin.json.message)).toMatch(/[Uu]nificación/);

      const otra = await conCorreccion();
      const cruzada = `/clientes/${clienteId}/correcciones/${otra.correccionId}/unificacion-nss`;
      expect((await pedir('GET', cruzada, t(asesor))).estado).toBe(404);
      const inexistente = `/clientes/${clienteId}/correcciones/${randomUUID()}/unificacion-nss`;
      expect((await pedir('GET', inexistente, t(asesor))).estado).toBe(404);
      expect(
        (
          await pedir(
            'GET',
            `/clientes/${clienteId}/correcciones/no-uuid/unificacion-nss`,
            t(asesor),
          )
        ).estado,
      ).toBe(400);

      expect((await pedir('GET', base, t(otroAsesor))).estado).toBe(404);
      expect((await pedir('GET', base, t(auxiliar))).estado).toBe(403);
      expect((await pedir('GET', base, t(supervisor))).estado).toBe(403);
      expect((await pedir('GET', base)).estado).toBe(401);
    });

    it('CP-181 GET secundarios: lista con id, nss y observaciones; vacía sin detalle o sin secundarios', async () => {
      const { base } = await conCorreccion();
      const vaciaSinDetalle = await pedir('GET', `${base}/secundarios`, t(asesor));
      expect(vaciaSinDetalle.estado).toBe(200);
      expect(vaciaSinDetalle.json).toEqual([]);

      await pedir('PUT', base, t(asesor), {
        nss_principal_elegido: '12345678901',
        criterio_seleccion: 'antiguedad',
        etapa_institucional_actual: 'ingreso_validacion',
      });
      expect((await pedir('GET', `${base}/secundarios`, t(asesor))).json).toEqual([]);

      await pedir('POST', `${base}/secundarios`, t(asesor), {
        nss: '10987654321',
        observaciones: 'Duplicado antiguo',
      });
      await pedir('POST', `${base}/secundarios`, t(asesor), { nss: '11111111111' });
      const r = await pedir('GET', `${base}/secundarios`, t(asesor));
      expect(r.estado).toBe(200);
      expect(r.json).toHaveLength(2);
      for (const fila of r.json as Record<string, unknown>[]) {
        expect(Object.keys(fila).sort()).toEqual(
          ['id', 'nss', 'observaciones', 'unificacion_id'].sort(),
        );
      }
      expect((r.json as { nss: string }[]).map((s) => s.nss).sort()).toEqual([
        '10987654321',
        '11111111111',
      ]);
      expect(
        (r.json as { nss: string; observaciones: string | null }[]).find(
          (s) => s.nss === '10987654321',
        )!.observaciones,
      ).toBe('Duplicado antiguo');
    });

    it('CP-182 GET secundarios: corrección de otro cliente o inexistente 404; asesor ajeno 404, auxiliar y supervisor 403, sin token 401', async () => {
      const { base, clienteId } = await conCorreccion();
      const otra = await conCorreccion();
      const cruzada = `/clientes/${clienteId}/correcciones/${otra.correccionId}/unificacion-nss/secundarios`;
      expect((await pedir('GET', cruzada, t(asesor))).estado).toBe(404);
      const inexistente = `/clientes/${clienteId}/correcciones/${randomUUID()}/unificacion-nss/secundarios`;
      expect((await pedir('GET', inexistente, t(asesor))).estado).toBe(404);
      expect((await pedir('GET', `${base}/secundarios`, t(otroAsesor))).estado).toBe(404);
      expect((await pedir('GET', `${base}/secundarios`, t(auxiliar))).estado).toBe(403);
      expect((await pedir('GET', `${base}/secundarios`, t(supervisor))).estado).toBe(403);
      expect((await pedir('GET', `${base}/secundarios`)).estado).toBe(401);
    });
  });

  describe('Quitar una corrección (DELETE)', () => {
    const crear = async (clienteId: string, tipo: number, dueno: UsuarioPrueba = asesor) => {
      const r = await pedir('POST', `/clientes/${clienteId}/correcciones`, t(dueno), {
        tipo_correccion_id: tipo,
      });
      expect(r.estado).toBe(201);
      return r.json.id as string;
    };
    const tipoCurp = async () =>
      (
        await ctx.ds.query<{ id: number }[]>(
          `SELECT id FROM tipo_correccion WHERE nombre = 'Corrección de Domicilio'`,
        )
      )[0].id;
    const enBd = async (tabla: string, columna: string, valor: string) =>
      Number(
        (
          await ctx.ds.query<{ n: string }[]>(
            `SELECT count(*) AS n FROM ${tabla} WHERE ${columna} = $1`,
            [valor],
          )
        )[0].n,
      );

    it('CP-188 borra la corrección: 204 sin cuerpo y la fila desaparece; las demás correcciones del cliente se conservan', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      const tipo = await tipoCurp();
      const a = await crear(clienteId, tipo);
      const b = await crear(clienteId, tipo);
      const r = await fetch(`${ctx.base}/clientes/${clienteId}/correcciones/${a}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t(asesor)}` },
      });
      expect(r.status).toBe(204);
      expect(await r.text()).toBe('');
      expect(await enBd('correcciones_cliente', 'id', a)).toBe(0);
      const lista = await pedir('GET', `/clientes/${clienteId}/correcciones`, t(asesor));
      expect((lista.json as { id: string }[]).map((c) => c.id)).toEqual([b]);
      // Borrarla otra vez: ya no existe.
      expect(
        (await pedir('DELETE', `/clientes/${clienteId}/correcciones/${a}`, t(asesor))).estado,
      ).toBe(404);
    });

    it('CP-189 404 en español si la corrección no existe o es de otro cliente; 400 con un id inválido; la ajena no se borra', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      const otroCliente = await insertarCliente(ctx.ds, catalogo, asesor.id);
      const ajena = await crear(otroCliente, await tipoCurp());
      const cruzada = await pedir(
        'DELETE',
        `/clientes/${clienteId}/correcciones/${ajena}`,
        t(asesor),
      );
      expect(cruzada.estado).toBe(404);
      expect(cruzada.json.message).toBe('Corrección no encontrada.');
      expect(await enBd('correcciones_cliente', 'id', ajena)).toBe(1);
      expect(
        (await pedir('DELETE', `/clientes/${clienteId}/correcciones/${randomUUID()}`, t(asesor)))
          .estado,
      ).toBe(404);
      expect(
        (await pedir('DELETE', `/clientes/${clienteId}/correcciones/no-es-uuid`, t(asesor))).estado,
      ).toBe(400);
    });

    it('CP-190 alcance por rol: asesor ajeno 404, auxiliar y supervisor 403, sin token 401; nada se borra', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      const id = await crear(clienteId, await tipoCurp());
      await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
      const ruta = `/clientes/${clienteId}/correcciones/${id}`;
      expect((await pedir('DELETE', ruta, t(otroAsesor))).estado).toBe(404);
      expect((await pedir('DELETE', ruta, t(auxiliar))).estado).toBe(403);
      expect((await pedir('DELETE', ruta, t(supervisor))).estado).toBe(403);
      expect((await pedir('DELETE', ruta)).estado).toBe(401);
      expect(await enBd('correcciones_cliente', 'id', id)).toBe(1);
    });

    it('CP-191 una corrección de tipo NSS se borra con su detalle y sus NSS secundarios; otras unificaciones no se tocan', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      const montar = async (nss: string, secundario: string) => {
        const id = await crear(clienteId, tipoNss);
        const base = `/clientes/${clienteId}/correcciones/${id}/unificacion-nss`;
        await pedir('PUT', base, t(asesor), {
          nss_principal_elegido: nss,
          criterio_seleccion: 'antiguedad',
          etapa_institucional_actual: 'ingreso_validacion',
        });
        await pedir('POST', `${base}/secundarios`, t(asesor), { nss: secundario });
        return id;
      };
      const borrar = await montar('12345678901', '10987654321');
      const conservar = await montar('22222222222', '33333333333');
      const detalleBorrado = (
        await ctx.ds.query<{ id: string }[]>(
          'SELECT id FROM unificacion_nss_detalle WHERE correccion_id = $1',
          [borrar],
        )
      )[0].id;

      const r = await pedir('DELETE', `/clientes/${clienteId}/correcciones/${borrar}`, t(asesor));
      expect(r.estado).toBe(204);
      expect(await enBd('correcciones_cliente', 'id', borrar)).toBe(0);
      expect(await enBd('unificacion_nss_detalle', 'correccion_id', borrar)).toBe(0);
      expect(await enBd('unificacion_nss_secundarios', 'unificacion_id', detalleBorrado)).toBe(0);
      // La otra unificación del mismo cliente queda intacta, con su detalle y su secundario.
      expect(await enBd('correcciones_cliente', 'id', conservar)).toBe(1);
      expect(await enBd('unificacion_nss_detalle', 'correccion_id', conservar)).toBe(1);
      const sec = await pedir(
        'GET',
        `/clientes/${clienteId}/correcciones/${conservar}/unificacion-nss/secundarios`,
        t(asesor),
      );
      expect((sec.json as { nss: string }[]).map((x) => x.nss)).toEqual(['33333333333']);
    });

    it('CP-192 GET /correcciones refleja el borrado: F2 deja de requerirse sin correcciones que no sean de tipo NSS; lo demás no cambia', async () => {
      const dueno = await crearUsuarioPrueba(ctx.ds, 'asesor');
      const clienteId = await insertarCliente(ctx.ds, catalogo, dueno.id);
      const tipo = await tipoCurp();
      const f2a = await crear(clienteId, tipo, dueno);
      const f2b = await crear(clienteId, tipo, dueno);
      const nss = await crear(clienteId, tipoNss, dueno);
      await ctx.ds.query(
        `INSERT INTO analisis_recuperacion_semanas (diagnostico_id, aplica)
         VALUES ($1, 'si')`,
        [await insertarDiagnosticoF1(ctx.ds, clienteId, dueno.id)],
      );
      await insertarEtapa(ctx.ds, clienteId, 2, ID_ESTATUS['En proceso asesor'], 40);

      const fases = async () => (await listado(dueno)).clientes[0].fases;
      expect((await fases()).map((f) => [f.requiere, f.correcciones])).toEqual([
        [true, 2],
        [true, null],
        [true, null],
      ]);

      await pedir('DELETE', `/clientes/${clienteId}/correcciones/${f2a}`, t(dueno));
      expect((await fases()).map((f) => [f.requiere, f.correcciones])).toEqual([
        [true, 1],
        [true, null],
        [true, null],
      ]);

      await pedir('DELETE', `/clientes/${clienteId}/correcciones/${f2b}`, t(dueno));
      const sinF2 = await fases();
      // F2 deja de requerirse (la de tipo NSS no cuenta); F3 y F4 y los datos de la etapa 2 siguen igual.
      expect(sinF2.map((f) => [f.requiere, f.correcciones])).toEqual([
        [false, 0],
        [true, null],
        [true, null],
      ]);
      expect(sinF2[0]).toMatchObject({ estatus: 'En proceso asesor', avance_porcentaje: 40 });
      expect((await listado(dueno)).resumen).toEqual({
        clientes_con_correcciones: 1,
        documentos_por_subir: 2,
      });

      // Al quitar también la de tipo NSS, F3 deja de requerirse; queda solo F4.
      await pedir('DELETE', `/clientes/${clienteId}/correcciones/${nss}`, t(dueno));
      expect((await fases()).map((f) => f.requiere)).toEqual([false, false, true]);
    });
  });
});
