import { Rol } from './common/auth/authenticated-user';
import { AppConBd, describeConBd, iniciarAppConBd } from './common/testing/bd-pruebas';
import { tokenDe } from './common/testing/tokens';

// Catálogos que necesita el frontend (CP-76): aplicación real y base de pruebas, solo lectura.
jest.setTimeout(60_000);

const ROLES: Rol[] = ['asesor', 'auxiliar', 'supervisor'];
const CATALOGOS: { ruta: string; tabla: string }[] = [
  { ruta: '/catalogos/estatus', tabla: 'estatus_tramite' },
  { ruta: '/catalogos/regimenes', tabla: 'regimen_principal' },
  { ruta: '/catalogos/leyes-probables', tabla: 'ley_probable' },
  { ruta: '/catalogos/afores', tabla: 'afore' },
  { ruta: '/catalogos/tipos-documento', tabla: 'tipo_documento' },
  { ruta: '/catalogos/objetivos-especificos', tabla: 'objetivo_especifico_inicial' },
];

describeConBd('Catálogos (aplicación real y base de pruebas)', () => {
  let ctx: AppConBd;

  const pedir = async (ruta: string, token?: string) => {
    const respuesta = await fetch(`${ctx.base}${ruta}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, json: texto ? (JSON.parse(texto) as unknown) : null };
  };

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
  });

  afterAll(async () => {
    await ctx?.app.close();
  });

  it('CP-76 los seis catálogos responden 200 con la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor', async () => {
    for (const { ruta, tabla } of CATALOGOS) {
      const filas = await ctx.ds.query<{ id: number }[]>(`SELECT id FROM ${tabla} ORDER BY id`);
      expect(filas.length).toBeGreaterThan(0);
      for (const rol of ROLES) {
        const { estado, json } = await pedir(ruta, tokenDe(rol));
        expect({ ruta, rol, estado }).toEqual({ ruta, rol, estado: 200 });
        const ids = (json as { id: number }[]).map((f) => f.id);
        expect({ ruta, rol, ids }).toEqual({ ruta, rol, ids: filas.map((f) => f.id) });
      }
    }
  });

  it('CP-76 los catálogos traen el nombre de cada elemento', async () => {
    for (const { ruta } of CATALOGOS) {
      const { json } = await pedir(ruta, tokenDe('asesor'));
      for (const fila of json as Record<string, unknown>[]) {
        expect({ ruta, id: fila.id, nombre: typeof fila.nombre }).toEqual({
          ruta,
          id: fila.id,
          nombre: 'string',
        });
      }
    }
  });

  it('CP-76 sin token o con un rol fuera del contrato los catálogos responden 401', async () => {
    for (const { ruta } of CATALOGOS) {
      expect((await pedir(ruta)).estado).toBe(401);
      expect((await pedir(ruta, tokenDe('rol-inventado'))).estado).toBe(401);
    }
  });

  it('CP-183 el catálogo de tipos de documento incluye los 3 tipos de Correcciones, en orden y con ids consecutivos a los existentes', async () => {
    const nuevos = [
      'Certificación de regularización y/o corrección de datos personales del asegurado (IMSS)',
      'Constancia de Aclaración de Semanas Cotizadas (IMSS)',
      'Solicitud de Reintegro de Recursos (AFORE)',
    ];
    for (const rol of ROLES) {
      const { estado, json } = await pedir('/catalogos/tipos-documento', tokenDe(rol));
      expect(estado).toBe(200);
      const lista = json as { id: number; nombre: string }[];
      const filas = nuevos.map((n) => lista.find((f) => f.nombre === n));
      expect(filas.every((f) => f !== undefined)).toBe(true);
      const ids = filas.map((f) => f!.id);
      expect(ids).toEqual([ids[0], ids[0] + 1, ids[0] + 2]);
      // Van a continuación de los 14 tipos originales (que conservan su id y su orden).
      expect(lista.slice(0, 14).map((f) => f.id)).toEqual(
        Array.from({ length: 14 }, (_, k) => k + 1),
      );
      expect(lista.find((f) => f.id === 14)!.nombre).toBe(
        'Semanas ISSSTE / Constancia de Portabilidad',
      );
      expect(ids[0]).toBe(15);
    }
  });
});
