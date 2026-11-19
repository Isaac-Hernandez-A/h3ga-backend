import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { leerHojaClientes } from './lector-excel';
import { sanearCurp, sexoDeCurp } from './saneadores/curp';
import { sanearNss } from './saneadores/nss';
import { sanearRfc } from './saneadores/rfc';

// Saneadores de CURP, NSS y RFC (Actividad 5, Tarea 5). Solo formato y coherencia de fecha: no se valida
// el dígito verificador. Todos los datos son ficticios.
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const FIXTURE = resolve(
  __dirname,
  '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
);
// Todos los mensajes de un resultado, para comprobar que no citan el dato.
const mensajes = (r: { ajustes: string[]; advertencias: string[]; rechazo: string | null }) => [
  ...r.ajustes,
  ...r.advertencias,
  ...(r.rechazo ? [r.rechazo] : []),
];

describe('sanearCurp', () => {
  it('CP-223 curp_minusculas: pasa a mayúsculas con ajuste', () => {
    const r = sanearCurp('miar610609hdfrnf68', utc(1961, 6, 9));
    expect(r.valor).toBe('MIAR610609HDFRNF68');
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.rechazo).toBeNull();
  });

  it('CP-223 una CURP ya limpia no lleva ajustes ni advertencias', () => {
    const r = sanearCurp('MIAR610609HDFRNF68', utc(1961, 6, 9));
    expect(r.valor).toBe('MIAR610609HDFRNF68');
    expect(r.ajustes).toEqual([]);
    expect(r.advertencias).toEqual([]);
  });

  it('CP-224 curp_con_espacios: "QAQD 760716 MOCPJXE8" da 18 caracteres sin espacios', () => {
    const r = sanearCurp('QAQD 760716 MOCPJXE8', utc(1976, 7, 16));
    expect(r.valor).toBe('QAQD760716MOCPJXE8');
    expect(r.valor).toHaveLength(18);
    expect(r.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-224 también quita guiones, espacios de no separación y caracteres invisibles', () => {
    expect(sanearCurp('MIAR-610609-HDFRNF68', null).valor).toBe('MIAR610609HDFRNF68');
    expect(sanearCurp(' MIAR610609HDFRNF68​', null).valor).toBe('MIAR610609HDFRNF68');
  });

  it('CP-225 curp_17_caracteres_rechaza', () => {
    const r = sanearCurp('GASC730208MPLJVFT', utc(1973, 2, 8));
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
    expect(sanearCurp('GASC730208MPLJVFT9X', null).rechazo).not.toBeNull(); // 19 caracteres
  });

  it('CP-226 curp_mes_13_rechaza: CAQH751312MQRBZC31 rechaza', () => {
    const r = sanearCurp('CAQH751312MQRBZC31', null);
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-226 rechaza también día inexistente, sexo inválido, estado inválido y números donde van letras', () => {
    expect(sanearCurp('CAQH750230MQRBZC31', null).rechazo).not.toBeNull(); // 30 de febrero
    expect(sanearCurp('CAQH750412XQRBZC31', null).rechazo).not.toBeNull(); // sexo X
    expect(sanearCurp('CAQH750412MXXBZC31', null).rechazo).not.toBeNull(); // estado XX
    expect(sanearCurp('CAQH75O412MQRBZC31', null).rechazo).not.toBeNull(); // letra O en la fecha
    expect(sanearCurp('CAQH750412MQRBZC3A', null).rechazo).not.toBeNull(); // el último va dígito
  });

  it('CP-226 la segunda posición debe ser vocal: una CURP válida con vocal pasa', () => {
    // Regla oficial: la segunda letra es A, E, I, O, U o X.
    for (const curp of [
      'QAQD760716MOCPJXE8',
      'MIAR610609HDFRNF68',
      'HOUW700909MNLTWL04',
      'NEOA610823HYNBSX91',
      'NUOA610823HYNBSX91',
    ]) {
      const r = sanearCurp(curp, null);
      expect(r.valor).toBe(curp);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-226 una consonante en la segunda posición rechaza por formato inválido', () => {
    // Las CURP del fixture anterior (QFQD, MMAR, HDUW) tenían consonante en la segunda letra.
    for (const curp of ['QFQD760716MOCPJXE8', 'MMAR610609HDFRNF68', 'HDUW700909MNLTWL04']) {
      const r = sanearCurp(curp, null);
      expect(r.valor).toBeNull();
      expect(r.rechazo).toMatch(/formato/);
      expect(r.rechazo).not.toContain(curp);
    }
  });

  it('CP-226 la segunda letra X pasa (es la que se usa cuando el apellido no tiene vocal)', () => {
    const r = sanearCurp('MXAR610609HDFRNF68', null);
    expect(r.valor).toBe('MXAR610609HDFRNF68');
    expect(r.rechazo).toBeNull();
  });

  it('CP-226 el 29 de febrero solo existe en año bisiesto (el siglo sale del carácter 17)', () => {
    expect(sanearCurp('CAQH720229MQRBZC31', null).valor).toBe('CAQH720229MQRBZC31'); // 1972
    expect(sanearCurp('CAQH710229MQRBZC31', null).rechazo).not.toBeNull(); // 1971
    expect(sanearCurp('CAQH000229MQRBZCA1', null).valor).toBe('CAQH000229MQRBZCA1'); // 2000, letra: siglo XXI
  });

  it('CP-227 curp_no_coincide_con_nacimiento_advierte: carga con advertencia', () => {
    const r = sanearCurp('MIAR610609HDFRNF68', utc(1962, 6, 9));
    expect(r.valor).toBe('MIAR610609HDFRNF68');
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
    // Difiere el mes o el día: también advierte.
    expect(sanearCurp('MIAR610609HDFRNF68', utc(1961, 7, 9)).advertencias).toHaveLength(1);
    expect(sanearCurp('MIAR610609HDFRNF68', utc(1961, 6, 10)).advertencias).toHaveLength(1);
  });

  it('CP-227 sin fecha de nacimiento no se compara y no advierte', () => {
    const r = sanearCurp('MIAR610609HDFRNF68', null);
    expect(r.valor).toBe('MIAR610609HDFRNF68');
    expect(r.advertencias).toEqual([]);
  });

  it('CP-234 dato_vacio_curp_rechaza: CURP vacía rechaza', () => {
    for (const vacio of [null, undefined, '', '   ', '​']) {
      const r = sanearCurp(vacio, null);
      expect(r.valor).toBeNull();
      expect(r.rechazo).not.toBeNull();
    }
  });

  it('CP-234 una celda con número o booleano en la CURP rechaza', () => {
    expect(sanearCurp(123456789, null).rechazo).not.toBeNull();
    expect(sanearCurp(true, null).rechazo).not.toBeNull();
  });

  it('CP-234 ningún mensaje contiene la CURP completa, ni como venía ni normalizada', () => {
    const casos: [string, Date | null][] = [
      ['miar610609hdfrnf68', utc(1962, 6, 9)],
      ['QAQD 760716 MOCPJXE8', utc(1976, 7, 16)],
      ['GASC730208MPLJVFT', null],
      ['CAQH751312MQRBZC31', null],
    ];
    for (const [original, nacimiento] of casos) {
      const limpio = original.replace(/\s/g, '').toUpperCase();
      for (const m of mensajes(sanearCurp(original, nacimiento))) {
        expect(m).not.toContain(original);
        expect(m.toUpperCase()).not.toContain(limpio);
      }
    }
  });

  it('CP-226 sobre el fixture solo las 2 CURP defectuosas sembradas (IDs 44 y 45) se rechazan', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const rechazados = renglones
      .filter((r) => sanearCurp(r.celdas['CURP'], null).rechazo !== null)
      .map((r) => r.celdas['ID']);
    expect(rechazados).toEqual([44, 45]);
  });
});

describe('sexoDeCurp', () => {
  it('CP-309 sexo_desde_curp: el carácter 11 "H" da "H" y "M" da "M"', () => {
    expect(sexoDeCurp('MIAR610609HDFRNF68')).toBe('H');
    expect(sexoDeCurp('QAQD760716MOCPJXE8')).toBe('M');
  });
});

describe('sanearNss', () => {
  it('CP-228 nss_guiones_y_espacios: dan 11 dígitos', () => {
    const a = sanearNss('99-03-30-4284-5', 'IMSS');
    expect(a.valor).toBe('99033042845');
    expect(a.ajustes.length).toBeGreaterThan(0);
    const b = sanearNss('99 34 63 5213 6', 'IMSS');
    expect(b.valor).toBe('99346352136');
    expect(b.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-228 un NSS de 11 dígitos ya limpio no lleva ajustes', () => {
    const r = sanearNss('99033042845', 'IMSS');
    expect(r.valor).toBe('99033042845');
    expect(r.ajustes).toEqual([]);
    expect(r.rechazo).toBeNull();
  });

  it('CP-229 nss_numerico: el número 99446026195 da "99446026195"', () => {
    const r = sanearNss(99446026195, 'IMSS');
    expect(r.valor).toBe('99446026195');
    expect(r.rechazo).toBeNull();
  });

  it('CP-229 un número no entero o negativo no es NSS', () => {
    expect(sanearNss(99446026195.5, 'IMSS').rechazo).not.toBeNull();
    expect(sanearNss(-99446026195, 'IMSS').rechazo).not.toBeNull();
  });

  it('CP-336 nss_cero_inicial: un número de 10 dígitos se completa con un cero a la izquierda (ajuste)', () => {
    const r = sanearNss(9904304284, 'IMSS');
    expect(r.valor).toBe('09904304284');
    expect(r.valor).toHaveLength(11);
    expect(r.ajustes).toEqual(['nss_cero_inicial']);
    expect(r.rechazo).toBeNull();
    expect(mensajes(r).join(' ')).not.toContain('9904304284');
  });

  it('CP-336 con texto no se completa: "9904304284" de 10 dígitos rechaza; tampoco 9 ni 12 dígitos como número', () => {
    expect(sanearNss('9904304284', 'IMSS').rechazo).not.toBeNull();
    expect(sanearNss(990430428, 'IMSS').rechazo).not.toBeNull();
    expect(sanearNss(990430428451, 'IMSS').rechazo).not.toBeNull();
    // Un número de 11 dígitos sigue sin ajustes.
    expect(sanearNss(99033042845, 'IMSS').ajustes).toEqual([]);
  });

  it('CP-230 nss_9_digitos_rechaza', () => {
    const r = sanearNss('991041726', 'IMSS');
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
    expect(sanearNss(991041726, 'IMSS').rechazo).not.toBeNull();
    expect(sanearNss('990330428451', 'IMSS').rechazo).not.toBeNull(); // 12 dígitos
  });

  it('CP-230 un NSS con letras rechaza', () => {
    expect(sanearNss('9903304284X', 'IMSS').rechazo).not.toBeNull();
    expect(sanearNss('sin dato', 'IMSS').rechazo).not.toBeNull();
  });

  it('CP-231 nss_vacio_issste_ok_otro_advierte: vacío con ISSSTE no advierte; con IMSS advierte', () => {
    const issste = sanearNss(null, 'ISSSTE');
    expect(issste.valor).toBeNull();
    expect(issste.advertencias).toEqual([]);
    expect(issste.rechazo).toBeNull();

    const imss = sanearNss(null, 'IMSS');
    expect(imss.valor).toBeNull();
    expect(imss.advertencias).toHaveLength(1);
    expect(imss.rechazo).toBeNull();
  });

  it('CP-231 vacío con texto en blanco o régimen desconocido o sin régimen también advierte', () => {
    expect(sanearNss('   ', 'IMSS').advertencias).toHaveLength(1);
    expect(sanearNss('', 'No determinado').advertencias).toHaveLength(1);
    expect(sanearNss(null, null).advertencias).toHaveLength(1);
    expect(sanearNss('  ', 'issste').advertencias).toEqual([]); // sin importar mayúsculas
  });

  it('CP-231 ningún mensaje contiene el NSS', () => {
    for (const original of ['99-03-30-4284-5', '991041726', '9903304284X']) {
      const digitos = original.replace(/\D/g, '');
      for (const m of mensajes(sanearNss(original, 'IMSS'))) {
        expect(m).not.toContain(original);
        if (digitos.length >= 6) expect(m).not.toContain(digitos);
      }
    }
  });

  it('CP-230 sobre el fixture: solo el NSS de 9 dígitos (ID 47) se rechaza y los vacíos son de ISSSTE', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const rechazados: unknown[] = [];
    const conAdvertencia: unknown[] = [];
    for (const r of renglones) {
      const s = sanearNss(r.celdas['NSS'], String(r.celdas['Régimen seguridad social']));
      if (s.rechazo !== null) rechazados.push(r.celdas['ID']);
      if (s.advertencias.length > 0) conAdvertencia.push(r.celdas['ID']);
    }
    expect(rechazados).toEqual([47]);
    expect(conAdvertencia).toEqual([]);
  });
});

describe('sanearRfc', () => {
  it('CP-232 rfc_mayusculas: ajusta y acepta 12 o 13 caracteres', () => {
    const persona = sanearRfc(' abcd 800101 xy1 ');
    expect(persona.valor).toBe('ABCD800101XY1');
    expect(persona.ajustes.length).toBeGreaterThan(0);
    const moral = sanearRfc('abc800101xy1');
    expect(moral.valor).toBe('ABC800101XY1');
    expect(moral.valor).toHaveLength(12);
    expect(moral.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-232 un RFC ya limpio no lleva ajustes y acepta Ñ y &', () => {
    const r = sanearRfc('ABCD800101XY1');
    expect(r.valor).toBe('ABCD800101XY1');
    expect(r.ajustes).toEqual([]);
    expect(sanearRfc('ÑAB&800101XY1').valor).toBe('ÑAB&800101XY1');
  });

  it('CP-233 rfc_invalido_advierte: da null con advertencia y sin rechazo', () => {
    for (const malo of ['ABCD8001', 'ABCD800101XY12345', 'ABCD-800101-X!1']) {
      const r = sanearRfc(malo);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toHaveLength(1);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-233 un RFC vacío da null sin advertencia', () => {
    for (const vacio of [null, undefined, '', '  ']) {
      const r = sanearRfc(vacio);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toEqual([]);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-233 ningún mensaje contiene el RFC', () => {
    for (const original of [' abcd 800101 xy1 ', 'ABCD8001']) {
      for (const m of mensajes(sanearRfc(original))) {
        expect(m).not.toContain(original.trim());
        expect(m.toUpperCase()).not.toContain(original.replace(/\s/g, '').toUpperCase());
      }
    }
  });

  it('CP-232 sobre el fixture los RFC dan RFC válido sin advertencias', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    for (const r of renglones) {
      const s = sanearRfc(r.celdas['RFC']);
      expect(s.advertencias).toEqual([]);
    }
  });
});
