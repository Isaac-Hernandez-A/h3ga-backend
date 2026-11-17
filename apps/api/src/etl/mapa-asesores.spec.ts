import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { leerHojaClientes } from './lector-excel';
import { MapaAsesores, UsuarioBuscado, UsuariosLookup } from './mapa-asesores';

// Equivalencias de asesores (Actividad 5, Tarea 7): nombre del Excel a usuario del sistema. Los correos
// y los usuarios son ficticios.
const DIR = resolve(__dirname, '../../../../test/fixtures/etl');
const FIXTURE = resolve(DIR, 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx');
const EQUIVALENCIAS = JSON.parse(
  readFileSync(resolve(DIR, 'equivalencias-asesores.json'), 'utf8'),
) as Record<string, string>;

const MARCO = 'marco.hernandez@ejemplo.test';
const ANA = 'ana.hernandez@ejemplo.test';

// Usuarios de mentira por correo, con un espía para contar las consultas.
function lookup(usuarios: Record<string, UsuarioBuscado>) {
  const llamadas: string[] = [];
  const servicio: UsuariosLookup = {
    buscarPorCorreo: (correo) => {
      llamadas.push(correo);
      return Promise.resolve(usuarios[correo] ?? null);
    },
  };
  return { servicio, llamadas };
}

const USUARIOS: Record<string, UsuarioBuscado> = {
  [MARCO]: { id: 'uuid-marco', activo: true, rol: 'asesor' },
  [ANA]: { id: 'uuid-ana', activo: true, rol: 'asesor' },
};

const mapa = (usuarios = USUARIOS, equivalencias = EQUIVALENCIAS) => {
  const { servicio, llamadas } = lookup(usuarios);
  return { mapa: new MapaAsesores(equivalencias, servicio), llamadas };
};

describe('MapaAsesores', () => {
  it('CP-247 resuelve_con_lic_y_acentos: "Lic. Marco Hernández" resuelve a su usuario', async () => {
    const { mapa: m, llamadas } = mapa();
    expect(await m.resolver('Lic. Marco Hernández')).toEqual({ usuarioId: 'uuid-marco' });
    expect(llamadas).toEqual([MARCO]);
    expect(await m.resolver('Lic. Ana Hernández')).toEqual({ usuarioId: 'uuid-ana' });
  });

  it('CP-248 resuelve_sin_lic_ni_acento: "Marco Hernandez" y "LIC. ANA HERNANDEZ" resuelven', async () => {
    const { mapa: m } = mapa();
    expect(await m.resolver('Marco Hernandez')).toEqual({ usuarioId: 'uuid-marco' });
    expect(await m.resolver('LIC. ANA HERNANDEZ')).toEqual({ usuarioId: 'uuid-ana' });
  });

  it('CP-248 también sin el punto, con "Licda." y con espacios de más', async () => {
    const { mapa: m } = mapa();
    expect(await m.resolver('Lic Ana Hernández')).toEqual({ usuarioId: 'uuid-ana' });
    expect(await m.resolver('Licda. Ana Hernández')).toEqual({ usuarioId: 'uuid-ana' });
    expect(await m.resolver('  lic.   marco   hernández  ')).toEqual({ usuarioId: 'uuid-marco' });
  });

  it('CP-248 las claves del JSON también se normalizan (sin Lic., con otras mayúsculas)', async () => {
    const { mapa: m } = mapa(USUARIOS, { 'MARCO HERNANDEZ': MARCO });
    expect(await m.resolver('Lic. Marco Hernández')).toEqual({ usuarioId: 'uuid-marco' });
  });

  it('CP-248 el correo de la equivalencia se busca en minúsculas y sin espacios', async () => {
    const { mapa: m, llamadas } = mapa(USUARIOS, {
      'Marco Hernández': '  Marco.Hernandez@Ejemplo.TEST ',
    });
    expect(await m.resolver('Marco Hernández')).toEqual({ usuarioId: 'uuid-marco' });
    expect(llamadas).toEqual([MARCO]);
  });

  it('CP-249 sin_equivalencia_rechaza: "Lic. Pedro Gómez" da rechazo "asesor sin equivalencia"', async () => {
    const { mapa: m, llamadas } = mapa();
    const r = await m.resolver('Lic. Pedro Gómez');
    expect(r).toHaveProperty('rechazo');
    expect((r as { rechazo: string }).rechazo).toMatch(/asesor sin equivalencia/i);
    // No consulta usuarios si no hay equivalencia.
    expect(llamadas).toEqual([]);
  });

  it('CP-249 una equivalencia que apunta a un correo sin usuario también rechaza', async () => {
    const { mapa: m } = mapa({});
    const r = (await m.resolver('Lic. Marco Hernández')) as { rechazo: string };
    expect(r.rechazo).toMatch(/no existe/i);
  });

  it('CP-250 usuario_inactivo_rechaza', async () => {
    const { mapa: m } = mapa({
      ...USUARIOS,
      [MARCO]: { id: 'uuid-marco', activo: false, rol: 'asesor' },
    });
    const r = (await m.resolver('Lic. Marco Hernández')) as { rechazo: string };
    expect(r.rechazo).toMatch(/inactivo/i);
    expect(r).not.toHaveProperty('usuarioId');
  });

  it('CP-251 usuario_sin_rol_asesor_rechaza: supervisor y auxiliar rechazan', async () => {
    for (const rol of ['supervisor', 'auxiliar'] as const) {
      const { mapa: m } = mapa({ ...USUARIOS, [MARCO]: { id: 'uuid-marco', activo: true, rol } });
      const r = (await m.resolver('Lic. Marco Hernández')) as { rechazo: string };
      expect(r.rechazo).toMatch(/rol de asesor|no es asesor/i);
      expect(r).not.toHaveProperty('usuarioId');
    }
  });

  it('CP-252 nombre_vacio_rechaza: null, vacío, en blanco o que no es texto', async () => {
    const { mapa: m, llamadas } = mapa();
    for (const malo of [null, undefined, '', '   ', 'Lic.', 42]) {
      const r = (await m.resolver(malo)) as { rechazo: string };
      expect(r.rechazo).toMatch(/vac/i);
      expect(r).not.toHaveProperty('usuarioId');
    }
    expect(llamadas).toEqual([]);
  });

  it('CP-247 consulta cada usuario una sola vez aunque el asesor aparezca en muchos renglones', async () => {
    const { mapa: m, llamadas } = mapa();
    for (let i = 0; i < 10; i++) await m.resolver('Lic. Marco Hernández');
    await m.resolver('Marco Hernandez');
    expect(llamadas).toEqual([MARCO]);
  });

  it('CP-249 dos nombres que se normalizan igual con correos distintos son un error de configuración', () => {
    const { servicio } = lookup(USUARIOS);
    expect(
      () => new MapaAsesores({ 'Lic. Marco Hernández': MARCO, 'MARCO HERNANDEZ': ANA }, servicio),
    ).toThrow(/Marco/i);
  });

  it('CP-247 sobre el fixture: solo el asesor "Lic. Pedro Gómez" (ID 49) se rechaza', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const { mapa: m } = mapa();
    const rechazados: unknown[] = [];
    for (const r of renglones) {
      const res = await m.resolver(r.celdas['Asesor']);
      if ('rechazo' in res) rechazados.push(r.celdas['ID']);
    }
    expect(rechazados).toEqual([49]);
  });
});
