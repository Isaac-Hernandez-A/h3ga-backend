import { randomUUID } from 'node:crypto';
import { fechaLocal } from '../common/fechas';
import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import { autorizarEnBd, limpiarDatosClientes } from '../common/testing/datos-clientes';
import { EntornoF1, entornoF1, http } from '../common/testing/f1';

// Diagnóstico Especializado F1, cabecera (CP-113 a CP-118) y sus catálogos: aplicación real y base de pruebas.
jest.setTimeout(90_000);

const CATALOGOS: { ruta: string; tabla: string }[] = [
  { ruta: '/catalogos/estrategias-recomendadas', tabla: 'estrategia_recomendada_tipo' },
  { ruta: '/catalogos/objetivos-diagnostico', tabla: 'objetivo_diagnostico' },
  { ruta: '/catalogos/tipos-inconsistencia', tabla: 'tipo_inconsistencia_detectada' },
  { ruta: '/catalogos/tipos-gestion-recuperacion', tabla: 'tipo_gestion_recuperacion' },
  { ruta: '/catalogos/tipos-evidencia-recuperacion', tabla: 'tipo_evidencia_recuperacion' },
  { ruta: '/catalogos/objetivos-modalidad-10', tabla: 'objetivo_modalidad_10' },
  { ruta: '/catalogos/objetivos-modalidad-40', tabla: 'objetivo_modalidad_40' },
  { ruta: '/catalogos/documentos-diagnostico', tabla: 'tipo_documento_diagnostico' },
];

describeConBd(
  'F1: cabecera del diagnóstico y catálogos (aplicación real y base de pruebas)',
  () => {
    let ctx: AppConBd;
    let e: EntornoF1;
    const ruta = (clienteId: string) => `/clientes/${clienteId}/diagnostico`;

    beforeAll(async () => {
      ctx = await iniciarAppConBd();
      e = await entornoF1(ctx);
    });

    afterAll(async () => {
      if (!ctx) return;
      await limpiarDatosClientes(ctx.ds);
      await ctx.app.close();
    });

    it('CP-113 POST crea el borrador con {}: asesor_id es el asesor del cliente, fecha_analisis es hoy (America/Cancun) y lo demás queda vacío', async () => {
      const clienteId = await e.cliente();
      const r = await http(ctx, 'POST', ruta(clienteId), e.t(e.asesor), {});
      expect(r.estado).toBe(201);
      expect(r.json).toMatchObject({
        cliente_id: clienteId,
        asesor_id: e.asesor.id,
        fecha_analisis: fechaLocal(new Date()),
        tipo_pension_probable: null,
        edad_objetivo_pension: null,
        conclusion_modalidad_10: null,
        justificacion_estrategia: null,
        semanas_descontadas: 0,
        requiere_reactivacion: false,
      });
    });

    it('CP-113 POST con datos los guarda (numéricos como número); un segundo POST responde 409; asesor_id del cuerpo no se acepta', async () => {
      const clienteId = await e.cliente();
      const r = await http(ctx, 'POST', ruta(clienteId), e.t(e.asesor), {
        fecha_analisis: '2026-10-01',
        tipo_pension_probable: 'cesantia',
        edad_objetivo_pension: 60,
        ultimo_salario_cotizado: 1234.5,
        comentarios_cliente: 'Quiere pensionarse pronto',
      });
      expect(r.estado).toBe(201);
      expect(r.json).toMatchObject({
        fecha_analisis: '2026-10-01',
        tipo_pension_probable: 'cesantia',
        edad_objetivo_pension: 60,
        ultimo_salario_cotizado: 1234.5,
      });
      const otra = await http(ctx, 'POST', ruta(clienteId), e.t(e.asesor), {});
      expect(otra.estado).toBe(409);
      expect((otra.json as { message: string }).message).toBe(
        'El cliente ya tiene diagnóstico especializado (F1).',
      );
      const otroCliente = await e.cliente();
      expect(
        (await http(ctx, 'POST', ruta(otroCliente), e.t(e.asesor), { asesor_id: e.otroAsesor.id }))
          .estado,
      ).toBe(400);
    });

    it('CP-114 GET: sin diagnóstico responde 200 con el cuerpo vacío; con diagnóstico, la fila', async () => {
      const clienteId = await e.cliente();
      const vacio = await http(ctx, 'GET', ruta(clienteId), e.t(e.asesor));
      expect(vacio.estado).toBe(200);
      expect(vacio.texto.trim()).toBe('');
      const creado = (
        await http(ctx, 'POST', ruta(clienteId), e.t(e.asesor), { edad_objetivo_pension: 62 })
      ).json as { id: string };
      const r = await http(ctx, 'GET', ruta(clienteId), e.t(e.asesor));
      expect(r.estado).toBe(200);
      expect(r.json).toMatchObject({
        id: creado.id,
        cliente_id: clienteId,
        edad_objetivo_pension: 62,
      });
    });

    it('CP-115 PATCH parcial: cambia solo lo enviado, null borra, {} no cambia nada; sin diagnóstico 404', async () => {
      const clienteId = await e.clienteConDiagnostico();
      const primero = await http(ctx, 'PATCH', ruta(clienteId), e.t(e.asesor), {
        tipo_pension_probable: 'vejez',
        conclusion_modalidad_10: 'aplica',
        comentarios_cliente: 'Primer comentario',
        ultimo_salario_cotizado: 800.25,
      });
      expect(primero.estado).toBe(200);
      expect(primero.json).toMatchObject({
        tipo_pension_probable: 'vejez',
        conclusion_modalidad_10: 'aplica',
        ultimo_salario_cotizado: 800.25,
      });
      const segundo = await http(ctx, 'PATCH', ruta(clienteId), e.t(e.asesor), {
        comentarios_cliente: null,
        semanas_efectivas_pension: 900,
      });
      expect(segundo.json).toMatchObject({
        comentarios_cliente: null,
        semanas_efectivas_pension: 900,
        tipo_pension_probable: 'vejez',
      });
      const igual = await http(ctx, 'PATCH', ruta(clienteId), e.t(e.asesor), {});
      expect(igual.estado).toBe(200);
      expect(igual.json).toEqual(segundo.json);
      const actualizado = (igual.json as { actualizado_en: string }).actualizado_en;
      expect(Date.parse(actualizado)).toBeGreaterThan(0);

      const sinDiagnostico = await e.cliente();
      expect((await http(ctx, 'PATCH', ruta(sinDiagnostico), e.t(e.asesor), {})).estado).toBe(404);
    });

    it('CP-115 PATCH inválido responde 400 y no cambia nada: enumerados, rangos, fechas, decimales y campos fuera del contrato', async () => {
      const clienteId = await e.clienteConDiagnostico();
      const antes = (await http(ctx, 'GET', ruta(clienteId), e.t(e.asesor))).json;
      const invalidos: [string, unknown][] = [
        ['tipo_pension_probable fuera del enum', { tipo_pension_probable: 'jubilacion' }],
        ['conclusion_modalidad_10 fuera del enum', { conclusion_modalidad_10: 'tal vez' }],
        ['edad_objetivo_pension negativa', { edad_objetivo_pension: -1 }],
        ['edad_objetivo_pension 200', { edad_objetivo_pension: 200 }],
        ['semanas_efectivas_pension negativas', { semanas_efectivas_pension: -5 }],
        ['semanas_efectivas_pension decimal', { semanas_efectivas_pension: 10.5 }],
        ['fecha_ultima_baja inválida', { fecha_ultima_baja: 'ayer' }],
        ['ultimo_salario_cotizado con 3 decimales', { ultimo_salario_cotizado: 1.234 }],
        ['ultimo_salario_cotizado enorme', { ultimo_salario_cotizado: 1e12 }],
        ['booleano como texto', { cotizo_antes_julio_1997: 'si' }],
        ['texto como número', { comentarios_cliente: 5 }],
        ['asesor_id', { asesor_id: e.otroAsesor.id }],
        ['cliente_id', { cliente_id: randomUUID() }],
        ['id', { id: randomUUID() }],
        ['creado_en', { creado_en: '2020-01-01' }],
        ['campo desconocido', { otro: 1 }],
      ];
      for (const [caso, cuerpo] of invalidos) {
        const r = await http(ctx, 'PATCH', ruta(clienteId), e.t(e.asesor), cuerpo);
        expect({ caso, estado: r.estado }).toEqual({ caso, estado: 400 });
      }
      expect((await http(ctx, 'GET', ruta(clienteId), e.t(e.asesor))).json).toEqual(antes);
    });

    it('CP-116 roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404', async () => {
      const clienteId = await e.clienteConDiagnostico();
      await autorizarEnBd(ctx.ds, clienteId, e.auxiliar.id, e.asesor.id, true);
      const accesos: [string, object?][] = [['GET'], ['PATCH', { edad_objetivo_pension: 63 }]];
      for (const [metodo, cuerpo] of accesos) {
        const r = {
          metodo,
          dueno: (await http(ctx, metodo, ruta(clienteId), e.t(e.asesor), cuerpo)).estado,
          supervisor: (await http(ctx, metodo, ruta(clienteId), e.t(e.supervisor), cuerpo)).estado,
          auxiliar: (await http(ctx, metodo, ruta(clienteId), e.t(e.auxiliar), cuerpo)).estado,
          sinToken: (await http(ctx, metodo, ruta(clienteId), undefined, cuerpo)).estado,
          ajeno: (await http(ctx, metodo, ruta(clienteId), e.t(e.otroAsesor), cuerpo)).estado,
          inexistente: (await http(ctx, metodo, ruta(randomUUID()), e.t(e.asesor), cuerpo)).estado,
        };
        expect(r).toEqual({
          metodo,
          dueno: 200,
          supervisor: 403,
          auxiliar: 403,
          sinToken: 401,
          ajeno: 404,
          inexistente: 404,
        });
      }
      const sinDiagnostico = await e.cliente();
      for (const quien of [e.supervisor, e.auxiliar]) {
        expect((await http(ctx, 'POST', ruta(sinDiagnostico), e.t(quien), {})).estado).toBe(403);
      }
      expect((await http(ctx, 'POST', ruta(sinDiagnostico), undefined, {})).estado).toBe(401);
      expect((await http(ctx, 'POST', ruta(sinDiagnostico), e.t(e.otroAsesor), {})).estado).toBe(
        404,
      );
      expect((await http(ctx, 'GET', ruta(sinDiagnostico), e.t(e.asesor))).estado).toBe(200);
    });

    it('CP-117 los 8 catálogos del F1 devuelven la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor; sin token 401', async () => {
      for (const { ruta: url, tabla } of CATALOGOS) {
        const filas = await ctx.ds.query<{ id: number }[]>(`SELECT id FROM ${tabla} ORDER BY id`);
        expect({ url, hay: filas.length > 0 }).toEqual({ url, hay: true });
        for (const quien of [e.asesor, e.auxiliar, e.supervisor]) {
          const r = await http(ctx, 'GET', url, e.t(quien));
          expect({ url, rol: quien.rol, estado: r.estado }).toEqual({
            url,
            rol: quien.rol,
            estado: 200,
          });
          const lista = r.json as { id: number; nombre: string }[];
          expect(lista.map((x) => x.id)).toEqual(filas.map((x) => x.id));
          expect(lista.every((x) => typeof x.nombre === 'string')).toBe(true);
        }
        expect((await http(ctx, 'GET', url)).estado).toBe(401);
      }
      const documentos = (
        await http(ctx, 'GET', '/catalogos/documentos-diagnostico', e.t(e.asesor))
      ).json as { nombre: string }[];
      expect(documentos).toHaveLength(9);
      expect(documentos[0].nombre).toBe('Constancia de semanas cotizadas IMSS');
    });

    it('CP-118 ninguna entrada responde 500 en POST y PATCH del diagnóstico', async () => {
      const clienteId = await e.clienteConDiagnostico();
      const resultados: { caso: string; estado: number }[] = [];
      for (const crudo of ['', '{', 'null', '[]', '"texto"', '123']) {
        for (const metodo of ['PATCH', 'POST']) {
          const r = await http(ctx, metodo, ruta(clienteId), e.t(e.asesor), undefined, crudo);
          resultados.push({ caso: `${metodo} ${crudo}`, estado: r.estado });
        }
      }
      for (const cuerpo of [
        { comentarios_cliente: 'x'.repeat(200_000) },
        { comentarios_cliente: 'a\u0000b' },
        { edad_objetivo_pension: 1e21 },
        { ultimo_salario_cotizado: null, fecha_ultima_baja: null, tipo_pension_probable: null },
      ]) {
        const r = await http(ctx, 'PATCH', ruta(clienteId), e.t(e.asesor), cuerpo);
        resultados.push({ caso: JSON.stringify(cuerpo).slice(0, 40), estado: r.estado });
      }
      for (const { caso, estado } of resultados) {
        expect({ caso, quinientos: estado >= 500 }).toEqual({ caso, quinientos: false });
      }
    });
  },
);
