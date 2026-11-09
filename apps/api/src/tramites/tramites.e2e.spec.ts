import { AppConBd, describeConBd, iniciarAppConBd } from '../common/testing/bd-pruebas';
import {
  autorizarEnBd,
  crearUsuarioPrueba,
  cuerpoCliente,
  curpFicticia,
  ID_ESTATUS,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  insertarDiagnosticoF1,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../common/testing/datos-clientes';
import { tokenDe } from '../common/testing/tokens';

// Flujo HTTP real (AppModule completo) de los trámites F2, F3 y F4 contra la base de pruebas.
jest.setTimeout(90_000);

type Json = Record<string, unknown>;

describeConBd('Trámites F2, F3 y F4 (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;
  let otroAsesor: UsuarioPrueba;
  let auxiliar: UsuarioPrueba;
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const tipos = new Map<string, number>();
  const TIPO = {
    curp: 'Corrección de CURP',
    rfc: 'Corrección de RFC',
    acta: 'Corrección de Acta de Nacimiento',
    nombre: 'Corrección de Nombre y/o Apellidos',
    nacimiento: 'Corrección de Fecha o Lugar de Nacimiento',
    sexo: 'Corrección de Sexo / Género',
    nss: 'Unificación de NSS (Duplicidad / Multiplicidad)',
    afore: 'Corrección de Datos en AFORE',
    imss: 'Regularización / Actualización de Datos ante IMSS (SINDO)',
    otro: 'Otro',
  };

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
    return { estado: respuesta.status, json: (texto ? JSON.parse(texto) : {}) as Json };
  }

  // Cliente creado por la API (con sus 16 etapas) a nombre del asesor de prueba.
  async function clienteConEtapas(extra: object = {}) {
    const { estado, json } = await pedir(
      'POST',
      '/clientes',
      t(asesor),
      cuerpoCliente(catalogo, extra),
    );
    expect(estado).toBe(201);
    return json.id as string;
  }

  const correccion = (clienteId: string, tipo: keyof typeof TIPO, extra: object = {}) =>
    pedir('POST', `/clientes/${clienteId}/correcciones`, t(asesor), {
      tipo_correccion_id: tipos.get(TIPO[tipo]),
      ...extra,
    });

  const fila = async (clienteId: string) =>
    (await ctx.ds.query<Json[]>('SELECT * FROM clientes WHERE id = $1', [clienteId]))[0];

  async function finalizarEtapa2(clienteId: string) {
    const lista = await pedir('GET', `/clientes/${clienteId}/etapas`, t(asesor));
    const etapas = (lista.json as unknown as { etapas: { id: string; numero_paso: number }[] })
      .etapas;
    const id = etapas.find((e) => e.numero_paso === 2)!.id;
    return pedir('PATCH', `/clientes/${clienteId}/etapas/${id}`, t(asesor), {
      estatus_id: ID_ESTATUS.Finalizado,
    });
  }

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
    auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
    const filas = await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM tipo_correccion',
    );
    filas.forEach((f) => tipos.set(f.nombre, f.id));
    for (const nombre of Object.values(TIPO)) expect(tipos.has(nombre)).toBe(true);
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  describe('F2: correcciones', () => {
    it('CP-29 corrección CURP con dato_actual y dato_correcto: 201; sin dato_correcto responde 400', async () => {
      const clienteId = await clienteConEtapas();
      const ok = await correccion(clienteId, 'curp', {
        dato_actual: 'PEPJ700517HQRRRN00',
        dato_correcto: curpFicticia(),
      });
      expect(ok.estado).toBe(201);
      expect(ok.json).toMatchObject({ cliente_id: clienteId });

      const sin = await correccion(clienteId, 'curp', { dato_actual: 'PEPJ700517HQRRRN00' });
      expect(sin.estado).toBe(400);
      const inexistente = await pedir('POST', `/clientes/${clienteId}/correcciones`, t(asesor), {
        tipo_correccion_id: 30000,
        dato_correcto: 'x',
      });
      expect(inexistente.estado).toBe(400);
    });

    it('CP-31 dato_correcto con CURP mal formada responde 400 y el cliente queda intacto', async () => {
      const clienteId = await clienteConEtapas();
      const antes = await fila(clienteId);
      const mala = await correccion(clienteId, 'curp', { dato_correcto: 'CURP-MAL-FORMADA' });
      expect(mala.estado).toBe(400);
      expect(await fila(clienteId)).toEqual(antes);
      const filas = await ctx.ds.query('SELECT 1 FROM correcciones_cliente WHERE cliente_id = $1', [
        clienteId,
      ]);
      expect(filas).toHaveLength(0);
    });

    it('CP-30 al finalizar la etapa 2 se copian CURP, RFC, nacimiento, sexo y nombre; Acta, AFORE, IMSS y Otro no sobrescriben', async () => {
      const clienteId = await clienteConEtapas({ nombre: 'Juan', sexo: 'hombre' });
      const antes = await fila(clienteId);
      const curp = curpFicticia();
      for (const [tipo, dato] of [
        ['curp', curp],
        ['rfc', 'PEPJ700517AB1'],
        ['nacimiento', '1971-06-18'],
        ['sexo', 'mujer'],
        ['nombre', 'María Fernanda'],
        ['acta', 'ZZZ-acta'],
        ['afore', 'ZZZ-afore'],
        ['imss', 'ZZZ-imss'],
        ['otro', 'ZZZ-otro'],
      ] as const) {
        expect((await correccion(clienteId, tipo, { dato_correcto: dato })).estado).toBe(201);
      }
      // Registrar las correcciones no toca el expediente: solo lo hace finalizar la etapa 2.
      expect(await fila(clienteId)).toEqual(antes);

      const fin = await finalizarEtapa2(clienteId);
      expect(fin.estado).toBe(200);

      const despues = await fila(clienteId);
      expect(despues).toMatchObject({
        curp,
        rfc: 'PEPJ700517AB1',
        sexo: 'mujer',
        nombre: 'María Fernanda',
      });
      expect(String(despues.fecha_nacimiento)).toContain('1971');
      // Nada más cambió: apellidos y el resto del expediente quedan intactos.
      const sinCorregidas = (f: Json) =>
        Object.fromEntries(
          Object.entries(f).filter(
            ([k]) => !['curp', 'rfc', 'sexo', 'nombre', 'fecha_nacimiento'].includes(k),
          ),
        );
      const resto = sinCorregidas(despues);
      const restoAntes = sinCorregidas(antes);
      expect(resto).toEqual(restoAntes);
      expect(despues.apellido_paterno).toBe('Ficticio');
    });

    it('si aplicar las correcciones falla (CURP de otro cliente), la etapa 2 no queda Finalizada', async () => {
      const curp = curpFicticia();
      await clienteConEtapas({ curp });
      const clienteId = await clienteConEtapas();
      expect((await correccion(clienteId, 'curp', { dato_correcto: curp })).estado).toBe(201);

      const fin = await finalizarEtapa2(clienteId);
      expect(fin.estado).toBe(409);
      const etapas = await ctx.ds.query<{ estatus_id: number }[]>(
        `SELECT et.estatus_id FROM etapas_tramite et JOIN etapas_proceso ep ON ep.id = et.etapa_id
          WHERE et.cliente_id = $1 AND ep.numero_paso = 2`,
        [clienteId],
      );
      expect(etapas[0].estatus_id).toBe(ID_ESTATUS['Por iniciar']);
      expect((await fila(clienteId)).curp).toBeNull();
    });

    it('CP-35 un asesor no registra correcciones de clientes ajenos (404); el auxiliar recibe 403', async () => {
      const clienteId = await clienteConEtapas();
      const cuerpo = { tipo_correccion_id: tipos.get(TIPO.otro) };
      expect(
        (await pedir('POST', `/clientes/${clienteId}/correcciones`, t(otroAsesor), cuerpo)).estado,
      ).toBe(404);
      await autorizarEnBd(ctx.ds, clienteId, auxiliar.id, asesor.id, true);
      expect(
        (await pedir('POST', `/clientes/${clienteId}/correcciones`, t(auxiliar), cuerpo)).estado,
      ).toBe(403);
    });
  });

  describe('F3: unificación de NSS', () => {
    async function conUnificacion() {
      const clienteId = await clienteConEtapas();
      const c = await correccion(clienteId, 'nss');
      expect(c.estado).toBe(201);
      const base = `/clientes/${clienteId}/correcciones/${c.json.id as string}/unificacion-nss`;
      return { clienteId, base, correccionId: c.json.id as string };
    }
    const valido = {
      nss_principal_elegido: '12345678901',
      criterio_seleccion: 'antiguedad',
      etapa_institucional_actual: 'ingreso_validacion',
    };

    it('CP-32 nss_principal de 11 dígitos, criterio válido y etapa institucional válida; fuera de rango responde 400', async () => {
      const { base } = await conUnificacion();
      const ok = await pedir('PUT', base, t(asesor), valido);
      expect(ok.estado).toBe(200);
      expect(ok.json).toMatchObject(valido);

      for (const malo of [
        { nss_principal_elegido: '123' },
        { nss_principal_elegido: '123456789012' },
        { nss_principal_elegido: '1234567890A' },
        { criterio_seleccion: 'otro' },
        { etapa_institucional_actual: 'etapa_5' },
      ]) {
        expect((await pedir('PUT', base, t(asesor), { ...valido, ...malo })).estado).toBe(400);
      }
    });

    it('el PUT es idempotente (un solo detalle por corrección) y solo aplica a correcciones de unificación', async () => {
      const { base, correccionId } = await conUnificacion();
      await pedir('PUT', base, t(asesor), valido);
      await pedir('PUT', base, t(asesor), { ...valido, criterio_seleccion: 'vinculo_curp' });
      const filas = await ctx.ds.query<{ criterio_seleccion: string }[]>(
        'SELECT criterio_seleccion FROM unificacion_nss_detalle WHERE correccion_id = $1',
        [correccionId],
      );
      expect(filas).toEqual([{ criterio_seleccion: 'vinculo_curp' }]);

      const clienteId = await clienteConEtapas();
      const otra = await correccion(clienteId, 'otro');
      const ruta = `/clientes/${clienteId}/correcciones/${otra.json.id as string}/unificacion-nss`;
      expect((await pedir('PUT', ruta, t(asesor), valido)).estado).toBe(400);
    });

    it('CP-33 un secundario igual al principal responde 400; uno repetido responde 409', async () => {
      const { base } = await conUnificacion();
      const ruta = `${base}/secundarios`;
      // Sin la unificación guardada no hay principal contra el cual comparar.
      expect((await pedir('POST', ruta, t(asesor), { nss: '10000000001' })).estado).toBe(409);

      await pedir('PUT', base, t(asesor), valido);
      expect((await pedir('POST', ruta, t(asesor), { nss: '12345678901' })).estado).toBe(400);
      expect((await pedir('POST', ruta, t(asesor), { nss: '123' })).estado).toBe(400);
      expect((await pedir('POST', ruta, t(asesor), { nss: '10000000001' })).estado).toBe(201);
      expect((await pedir('POST', ruta, t(asesor), { nss: '10000000001' })).estado).toBe(409);
      expect((await pedir('POST', ruta, t(asesor), { nss: '10000000002' })).estado).toBe(201);

      // Cambiar el principal a uno que ya es secundario también es un conflicto de datos.
      const choque = await pedir('PUT', base, t(asesor), {
        ...valido,
        nss_principal_elegido: '10000000001',
      });
      expect(choque.estado).toBe(400);
    });

    it('dos altas simultáneas del mismo secundario dejan una sola fila', async () => {
      const { base, correccionId } = await conUnificacion();
      await pedir('PUT', base, t(asesor), valido);
      const estados = (
        await Promise.all(
          [1, 2, 3].map(() =>
            pedir('POST', `${base}/secundarios`, t(asesor), { nss: '10000000009' }),
          ),
        )
      ).map((r) => r.estado);
      expect(estados.filter((e) => e === 201)).toHaveLength(1);
      expect(estados.filter((e) => e === 409)).toHaveLength(2);
      const filas = await ctx.ds.query(
        `SELECT 1 FROM unificacion_nss_secundarios s
           JOIN unificacion_nss_detalle d ON d.id = s.unificacion_id WHERE d.correccion_id = $1`,
        [correccionId],
      );
      expect(filas).toHaveLength(1);
    });
  });

  describe('F4: recuperación de semanas', () => {
    it('CP-34 registrar el dictamen actualiza semanas_imss_reconocidas y no toca semanas_a_recuperar', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      await ctx.ds.query(
        'UPDATE clientes SET semanas_a_recuperar = 150, semanas_imss_reconocidas = 500 WHERE id = $1',
        [clienteId],
      );
      const ruta = `/clientes/${clienteId}/diagnostico/recuperacion-semanas`;
      const dictamen = {
        aplica: 'si',
        observaciones: 'Dictamen ficticio',
        semanas_imss_reconocidas: 640,
      };

      // Sin diagnóstico especializado (F1) no hay a qué colgar el análisis.
      expect((await pedir('PUT', ruta, t(asesor), dictamen)).estado).toBe(409);
      expect((await fila(clienteId)).semanas_imss_reconocidas).toBe(500);

      await insertarDiagnosticoF1(ctx.ds, clienteId, asesor.id);
      const ok = await pedir('PUT', ruta, t(asesor), dictamen);
      expect(ok.estado).toBe(200);
      expect(ok.json).toMatchObject({ aplica: 'si', observaciones: 'Dictamen ficticio' });
      const cliente = await fila(clienteId);
      expect(cliente.semanas_imss_reconocidas).toBe(640);
      expect(cliente.semanas_a_recuperar).toBe(150);

      // Idempotente: un solo análisis por diagnóstico.
      await pedir('PUT', ruta, t(asesor), { ...dictamen, aplica: 'no' });
      const analisis = await ctx.ds.query<{ aplica: string }[]>(
        `SELECT a.aplica FROM analisis_recuperacion_semanas a
           JOIN diagnostico_especializado d ON d.id = a.diagnostico_id WHERE d.cliente_id = $1`,
        [clienteId],
      );
      expect(analisis).toEqual([{ aplica: 'no' }]);
    });

    it('sin semanas_imss_reconocidas guarda el análisis y no cambia el cliente; un valor negativo responde 400', async () => {
      const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
      await insertarDiagnosticoF1(ctx.ds, clienteId, asesor.id);
      const ruta = `/clientes/${clienteId}/diagnostico/recuperacion-semanas`;
      expect(
        (await pedir('PUT', ruta, t(asesor), { aplica: 'requiere_mas_evidencia' })).estado,
      ).toBe(200);
      expect((await fila(clienteId)).semanas_imss_reconocidas).toBe(500);
      expect(
        (await pedir('PUT', ruta, t(asesor), { aplica: 'si', semanas_imss_reconocidas: -1 }))
          .estado,
      ).toBe(400);
      expect(
        (await pedir('PUT', ruta, t(otroAsesor), { aplica: 'si', semanas_imss_reconocidas: 1 }))
          .estado,
      ).toBe(404);
    });
  });
});
