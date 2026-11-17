import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import { sanearFecha } from './saneadores/fecha';

// Saneador de fechas (Actividad 5, Tarea 4). Todas las fechas de salida son UTC a medianoche y no
// dependen de la zona horaria del servidor. Datos ficticios.
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const HOY = utc(2026, 11, 16);
const nac = (raw: unknown, hoy = HOY) => sanearFecha(raw, { tipo: 'nacimiento', hoy });
const ing = (raw: unknown, hoy = HOY) => sanearFecha(raw, { tipo: 'ingreso', hoy });
const comp = (raw: unknown, hoy = HOY) => sanearFecha(raw, { tipo: 'compromiso', hoy });

describe('sanearFecha', () => {
  it('CP-215 acepta_fecha_de_excel: un Date a medianoche UTC pasa sin ajustes', () => {
    const r = ing(utc(2025, 1, 17));
    expect(r.valor).toEqual(utc(2025, 1, 17));
    expect(r.ajustes).toEqual([]);
    expect(r.advertencias).toEqual([]);
    expect(r.rechazo).toBeNull();
  });

  it('CP-215 un Date con hora se normaliza a UTC a medianoche y lo anota', () => {
    const r = ing(new Date(Date.UTC(2025, 0, 17, 18, 45, 10)));
    expect(r.valor).toEqual(utc(2025, 1, 17));
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.rechazo).toBeNull();
  });

  it('CP-215 un Date inválido (NaN) no es fecha: nacimiento rechaza, compromiso advierte', () => {
    expect(nac(new Date(NaN)).rechazo).not.toBeNull();
    const c = comp(new Date(NaN));
    expect(c.valor).toBeNull();
    expect(c.rechazo).toBeNull();
    expect(c.advertencias).toHaveLength(1);
  });

  it('CP-215 un número es una serie de Excel: 45995 es 2025-12-04', () => {
    const r = ing(45995);
    expect(r.valor).toEqual(utc(2025, 12, 4));
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.rechazo).toBeNull();
  });

  it('CP-215 una serie con parte decimal descarta la hora', () => {
    expect(ing(45000.75).valor).toEqual(utc(2023, 3, 15));
  });

  it('CP-215 un número fuera de toda serie razonable no se acepta como fecha', () => {
    expect(ing(-5).rechazo).not.toBeNull();
    expect(ing(Number.NaN).rechazo).not.toBeNull();
    expect(ing(99999999).rechazo).not.toBeNull();
  });

  it('CP-216 texto_dd_mm_aaaa: "20/03/2025" da 2025-03-20 con ajuste', () => {
    const r = ing('20/03/2025');
    expect(r.valor).toEqual(utc(2025, 3, 20));
    expect(r.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-216 es siempre dd/mm: "03/20/2025" (mm/dd) no se acepta y "05/06/2025" es 5 de junio', () => {
    expect(ing('03/20/2025').rechazo).not.toBeNull();
    expect(ing('05/06/2025').valor).toEqual(utc(2025, 6, 5));
  });

  it('CP-216 día y mes de un dígito y espacios alrededor valen', () => {
    expect(ing(' 5/6/2025 ').valor).toEqual(utc(2025, 6, 5));
  });

  it('CP-216 un año de dos dígitos se rechaza, no se adivina el siglo', () => {
    expect(ing('20/03/25').rechazo).not.toBeNull();
    expect(ing('20/03/25').valor).toBeNull();
    expect(comp('20/03/25').advertencias).toHaveLength(1);
  });

  it('CP-217 texto_aaaa_mm_dd: "2025-08-16"', () => {
    const r = ing('2025-08-16');
    expect(r.valor).toEqual(utc(2025, 8, 16));
    expect(r.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-218 texto_dd_mmm_aaaa: "19-nov-2025" da 2025-11-19', () => {
    const r = ing('19-nov-2025');
    expect(r.valor).toEqual(utc(2025, 11, 19));
    expect(r.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-218 todos los meses abreviados en español, con sept y sin importar mayúsculas', () => {
    const meses: [string, number][] = [
      ['ene', 1],
      ['feb', 2],
      ['mar', 3],
      ['abr', 4],
      ['may', 5],
      ['jun', 6],
      ['jul', 7],
      ['ago', 8],
      ['sep', 9],
      ['sept', 9],
      ['oct', 10],
      ['nov', 11],
      ['dic', 12],
    ];
    for (const [abrev, numero] of meses) {
      expect(ing(`10-${abrev}-2025`).valor).toEqual(utc(2025, numero, 10));
    }
    expect(ing('10-ENE-2025').valor).toEqual(utc(2025, 1, 10));
    expect(ing('10-Sept-2025').valor).toEqual(utc(2025, 9, 10));
  });

  it('CP-218 un mes en inglés o inventado no se acepta', () => {
    expect(ing('10-jan-2025').rechazo).not.toBeNull();
    expect(ing('10-xyz-2025').rechazo).not.toBeNull();
  });

  it('CP-219 fecha_inexistente_nacimiento_rechaza: "31/02/1968" da rechazo', () => {
    const r = nac('31/02/1968');
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-219 inexistentes en los demás formatos, y el 29 de febrero solo en bisiesto', () => {
    expect(nac('1968-02-30').rechazo).not.toBeNull();
    expect(nac('31-abr-1968').rechazo).not.toBeNull();
    expect(nac('29/02/1971').rechazo).not.toBeNull();
    expect(nac('29/02/1972').valor).toEqual(utc(1972, 2, 29));
  });

  it('CP-219 nacimiento e ingreso vacíos o ilegibles rechazan', () => {
    for (const malo of [null, undefined, '', '   ', 'no sé', true]) {
      expect(nac(malo).rechazo).not.toBeNull();
      expect(ing(malo).rechazo).not.toBeNull();
    }
  });

  it('CP-220 ingreso_futuro_rechaza: con hoy 2026-11-16, "2027-01-15" da rechazo', () => {
    const r = ing('2027-01-15');
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-220 el ingreso de hoy pasa y el de mañana se rechaza', () => {
    expect(ing(utc(2026, 11, 16)).valor).toEqual(utc(2026, 11, 16));
    expect(ing(utc(2026, 11, 17)).rechazo).not.toBeNull();
  });

  it('CP-221 edad_fuera_de_rango_rechaza: 18 años cumplidos hoy pasa; los cumple mañana, se rechaza', () => {
    expect(nac(utc(2008, 11, 16)).valor).toEqual(utc(2008, 11, 16));
    expect(nac(utc(2008, 11, 16)).rechazo).toBeNull();
    // Nace el 17 de noviembre de 2008: cumple 18 mañana, hoy tiene 17.
    const r = nac(utc(2008, 11, 17));
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-221 100 años cumplidos hoy pasa; 101 cumplidos hoy se rechaza; 101 mañana todavía pasa', () => {
    expect(nac(utc(1926, 11, 16)).rechazo).toBeNull(); // 100 hoy
    expect(nac(utc(1926, 11, 16)).valor).toEqual(utc(1926, 11, 16));
    expect(nac(utc(1925, 11, 16)).rechazo).not.toBeNull(); // 101 hoy
    expect(nac(utc(1925, 11, 17)).rechazo).toBeNull(); // cumple 101 mañana, hoy tiene 100
  });

  it('CP-221 nacer en el futuro se rechaza y el 29 de febrero cumple el 1 de marzo en año no bisiesto', () => {
    expect(nac(utc(2027, 1, 1)).rechazo).not.toBeNull();
    const nacida = utc(2000, 2, 29);
    expect(nac(nacida, utc(2018, 2, 28)).rechazo).not.toBeNull(); // tiene 17
    expect(nac(nacida, utc(2018, 3, 1)).rechazo).toBeNull(); // cumple 18
  });

  it('CP-221 el rango de edad no se aplica a ingreso ni a compromiso', () => {
    expect(ing(utc(1990, 1, 1)).valor).toEqual(utc(1990, 1, 1));
    expect(ing(utc(1990, 1, 1)).rechazo).toBeNull();
    expect(comp(utc(2030, 1, 1)).valor).toEqual(utc(2030, 1, 1));
    expect(comp(utc(2030, 1, 1)).rechazo).toBeNull();
  });

  it('CP-222 compromiso_invalido_advierte: "pronto" da null con advertencia, sin rechazo', () => {
    const r = comp('pronto');
    expect(r.valor).toBeNull();
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-222 una fecha compromiso vacía da null sin advertencia; una válida pasa', () => {
    for (const vacio of [null, undefined, '', '  ']) {
      const r = comp(vacio);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toEqual([]);
      expect(r.rechazo).toBeNull();
    }
    expect(comp('2026-12-01').valor).toEqual(utc(2026, 12, 1));
  });

  it('CP-222 una fecha compromiso inexistente advierte y no rechaza', () => {
    const r = comp('31/02/2026');
    expect(r.valor).toBeNull();
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-222 los mensajes no incluyen el valor original', () => {
    const r = nac('31/02/1968');
    const mensajes = [...r.ajustes, ...r.advertencias, r.rechazo ?? ''].join(' ');
    expect(mensajes).not.toContain('31/02/1968');
    expect(r.rechazo).not.toBeNull();
  });

  // La zona horaria se prueba en procesos hijo con TZ real en su entorno: dentro de Jest, cambiar
  // process.env.TZ no afecta a Date (Jest da a la prueba una copia aislada de process).
  describe('no depende de la zona horaria del servidor', () => {
    // Desfase esperado de new Date(2025, 0, 1).getTimezoneOffset() en cada zona (enero, sin horario de verano).
    const ZONAS: [string, number][] = [
      ['America/Merida', 360],
      ['Pacific/Pago_Pago', 660],
      ['Pacific/Kiritimati', -840],
      ['UTC', 0],
    ];

    // Casos que corre el hijo: [tipo, valor de la celda]. Los Date se arman con Date.UTC en el hijo.
    const PROGRAMA_HIJO = `
      const { sanearFecha } = require(process.argv[2]);
      const esperado = Number(process.argv[3]);
      const real = new Date(2025, 0, 1).getTimezoneOffset();
      if (real !== esperado) {
        console.error('El entorno no respeta TZ=' + process.env.TZ + ': desfase ' + real + ', se esperaba ' + esperado);
        process.exit(3);
      }
      const u = (a, m, d, h = 0, mi = 0) => new Date(Date.UTC(a, m - 1, d, h, mi));
      const hoy = u(2026, 11, 16);
      const casos = [
        ['ingreso', '20/03/2025'],
        ['ingreso', '2025-08-16'],
        ['ingreso', '19-nov-2025'],
        ['ingreso', 45995],
        ['ingreso', u(2025, 1, 17)],
        ['ingreso', u(2025, 1, 17, 23, 59)],
        ['ingreso', u(2025, 1, 17, 0, 1)],
        ['nacimiento', u(2008, 11, 16)],
        ['nacimiento', u(2008, 11, 17)],
        ['nacimiento', u(1926, 11, 16)],
        ['nacimiento', u(1925, 11, 16)],
        ['nacimiento', '31/02/1968'],
        ['ingreso', u(2026, 11, 16)],
        ['ingreso', u(2026, 11, 17)],
        ['compromiso', 'pronto'],
      ];
      const salida = casos.map(([tipo, raw]) => {
        const r = sanearFecha(raw, { tipo, hoy });
        return { valor: r.valor ? r.valor.toISOString() : null, rechazo: r.rechazo !== null, advertencias: r.advertencias.length };
      });
      process.stdout.write(JSON.stringify(salida));
    `;

    const iso = (a: number, m: number, d: number) => utc(a, m, d).toISOString();
    const ESPERADO = [
      { valor: iso(2025, 3, 20), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 8, 16), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 11, 19), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 12, 4), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 1, 17), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 1, 17), rechazo: false, advertencias: 0 },
      { valor: iso(2025, 1, 17), rechazo: false, advertencias: 0 },
      { valor: iso(2008, 11, 16), rechazo: false, advertencias: 0 },
      { valor: null, rechazo: true, advertencias: 0 },
      { valor: iso(1926, 11, 16), rechazo: false, advertencias: 0 },
      { valor: null, rechazo: true, advertencias: 0 },
      { valor: null, rechazo: true, advertencias: 0 },
      { valor: iso(2026, 11, 16), rechazo: false, advertencias: 0 },
      { valor: null, rechazo: true, advertencias: 0 },
      { valor: null, rechazo: false, advertencias: 1 },
    ];

    let carpeta: string;
    let moduloFecha: string;
    let programa: string;

    beforeAll(() => {
      carpeta = mkdtempSync(join(tmpdir(), 'etl-fecha-'));
      // Transpila fecha.ts a CommonJS para cargarlo en el hijo, sin dependencias nuevas.
      const fuente = readFileSync(join(__dirname, 'saneadores', 'fecha.ts'), 'utf8');
      const { outputText } = ts.transpileModule(fuente, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      });
      moduloFecha = join(carpeta, 'fecha.js');
      programa = join(carpeta, 'hijo.js');
      writeFileSync(moduloFecha, outputText);
      writeFileSync(programa, PROGRAMA_HIJO);
    });

    afterAll(() => {
      rmSync(carpeta, { recursive: true, force: true });
    });

    function correrEnZona(zona: string, desfase: number) {
      const hijo = spawnSync(process.execPath, [programa, moduloFecha, String(desfase)], {
        env: { ...process.env, TZ: zona },
        encoding: 'utf8',
        timeout: 20_000,
      });
      if (hijo.error)
        throw new Error(`No se pudo correr el hijo en ${zona}: ${hijo.error.message}`);
      if (hijo.status === 3) throw new Error(`En ${zona}: ${hijo.stderr.trim()}`);
      if (hijo.status !== 0) throw new Error(`El hijo falló en ${zona}: ${hijo.stderr.trim()}`);
      return JSON.parse(hijo.stdout) as typeof ESPERADO;
    }

    it('CP-215 a CP-221 dan el mismo resultado con TZ de Mérida, Samoa, Kiritimati y UTC', () => {
      const resultados = ZONAS.map(([zona, desfase]) => correrEnZona(zona, desfase));
      for (const resultado of resultados) expect(resultado).toEqual(ESPERADO);
      for (const resultado of resultados.slice(1)) expect(resultado).toEqual(resultados[0]);
    }, 90_000);
  });
});
