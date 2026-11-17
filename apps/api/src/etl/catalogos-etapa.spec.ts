import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLUMNAS_OBLIGATORIAS, leerHojaClientes } from './lector-excel';
import { sanearCatalogo, sanearSemanas } from './saneadores/catalogos';
import { sanearEstatusAvance } from './saneadores/etapa';

// Catálogos, estatus, avance y semanas (Actividad 5, Tarea 6). Los catálogos son los del sistema
// (db/migrations/202610301007_semillas_catalogos.sql). Datos ficticios.
const FIXTURE = resolve(
  __dirname,
  '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
);
const MOTIVO_BLOQUEO = 'Importado desde Excel, sin motivo registrado';
const ea = (estatus: unknown, avance: unknown) => sanearEstatusAvance(estatus, avance);

describe('sanearCatalogo', () => {
  it('CP-235 compara_sin_acentos_ni_mayusculas: "imss" da "IMSS" y "xxi banorte" da "XXI Banorte"', () => {
    const a = sanearCatalogo('imss', 'regimen');
    expect(a.valor).toBe('IMSS');
    expect(a.ajustes.length).toBeGreaterThan(0);
    expect(a.advertencias).toEqual([]);
    const b = sanearCatalogo('xxi banorte', 'afore');
    expect(b.valor).toBe('XXI Banorte');
    expect(b.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-235 sin acentos y con espacios de más: "decimo  transitorio issste " da el nombre del catálogo', () => {
    const r = sanearCatalogo(' decimo  transitorio issste ', 'ley');
    expect(r.valor).toBe('Décimo Transitorio ISSSTE');
    expect(r.ajustes.length).toBeGreaterThan(0);
  });

  it('CP-235 un valor ya exacto no lleva ajustes', () => {
    for (const [raw, cat, esperado] of [
      ['IMSS', 'regimen', 'IMSS'],
      ['Ley 73', 'ley', 'Ley 73'],
      ['Sura', 'afore', 'Sura'],
      ['Mixto IMSS-ISSSTE', 'regimen', 'Mixto IMSS-ISSSTE'],
    ] as const) {
      const r = sanearCatalogo(raw, cat);
      expect(r.valor).toBe(esperado);
      expect(r.ajustes).toEqual([]);
      expect(r.advertencias).toEqual([]);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-235 el estado civil de la hoja Catálogo ("Soltero (a)") da el valor del enum de la base', () => {
    const casos: [string, string][] = [
      ['Soltero (a)', 'soltero'],
      ['Casado (a)', 'casado'],
      ['Divorciado (a)', 'divorciado'],
      ['Viudo (a)', 'viudo'],
      ['Concubinato', 'concubinato'],
      ['CASADA', 'casado'],
      ['viuda', 'viudo'],
    ];
    for (const [raw, esperado] of casos) {
      const r = sanearCatalogo(raw, 'estadoCivil');
      expect(r.valor).toBe(esperado);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-236 alias_banamex: "Banamex" da "Citibanamex" y "Pension ISSSTE" da "PENSIONISSSTE"', () => {
    const a = sanearCatalogo('Banamex', 'afore');
    expect(a.valor).toBe('Citibanamex');
    expect(a.ajustes.length).toBeGreaterThan(0);
    const b = sanearCatalogo('Pension ISSSTE', 'afore');
    expect(b.valor).toBe('PENSIONISSSTE');
    expect(b.ajustes.length).toBeGreaterThan(0);
    expect(sanearCatalogo('pensionissste', 'afore').valor).toBe('PENSIONISSSTE');
  });

  it('CP-236 el alias de la hoja Catálogo "Mixto / revisar" da "Mixto/revisar" del sistema', () => {
    const r = sanearCatalogo('Mixto / revisar', 'ley');
    expect(r.valor).toBe('Mixto/revisar');
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.advertencias).toEqual([]);
  });

  it('CP-237 regimen_y_ley_desconocidos: dan "No determinado" con advertencia ("Ley 71")', () => {
    const ley = sanearCatalogo('Ley 71', 'ley');
    expect(ley.valor).toBe('No determinado');
    expect(ley.advertencias).toHaveLength(1);
    expect(ley.rechazo).toBeNull();
    const regimen = sanearCatalogo('Régimen inventado', 'regimen');
    expect(regimen.valor).toBe('No determinado');
    expect(regimen.advertencias).toHaveLength(1);
    expect(regimen.rechazo).toBeNull();
  });

  it('CP-237 régimen o ley vacíos también dan "No determinado" con advertencia', () => {
    for (const cat of ['regimen', 'ley'] as const) {
      for (const vacio of [null, undefined, '', '   ']) {
        const r = sanearCatalogo(vacio, cat);
        expect(r.valor).toBe('No determinado');
        expect(r.advertencias).toHaveLength(1);
        expect(r.rechazo).toBeNull();
      }
    }
  });

  it('CP-237 "No determinado" escrito en el Excel pasa sin advertencia', () => {
    for (const cat of ['regimen', 'ley'] as const) {
      const r = sanearCatalogo('No determinado', cat);
      expect(r.valor).toBe('No determinado');
      expect(r.advertencias).toEqual([]);
    }
  });

  it('CP-238 afore_y_estado_civil_vacios_o_desconocidos: dan rechazo, sin valor neutro', () => {
    for (const cat of ['afore', 'estadoCivil'] as const) {
      for (const malo of [null, undefined, '', '   ', 'Valor que no existe', 42]) {
        const r = sanearCatalogo(malo, cat);
        expect(r.valor).toBeNull();
        expect(r.rechazo).not.toBeNull();
      }
    }
  });

  it('CP-238 "No determinado" no es una AFORE ni un estado civil: rechaza', () => {
    expect(sanearCatalogo('No determinado', 'afore').rechazo).not.toBeNull();
    expect(sanearCatalogo('No determinado', 'estadoCivil').rechazo).not.toBeNull();
  });

  it('CP-235 sobre el fixture: solo "Ley 71" (ID 40) advierte y ninguna AFORE ni estado civil rechaza', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const advierten: unknown[] = [];
    for (const r of renglones) {
      const reg = sanearCatalogo(r.celdas['Régimen seguridad social'], 'regimen');
      const ley = sanearCatalogo(r.celdas['Ley probable'], 'ley');
      const afore = sanearCatalogo(r.celdas['AFORE'], 'afore');
      const civil = sanearCatalogo(r.celdas['Estado civil'], 'estadoCivil');
      if (reg.advertencias.length + ley.advertencias.length > 0) advierten.push(r.celdas['ID']);
      expect(afore.rechazo).toBeNull();
      expect(civil.rechazo).toBeNull();
      expect(reg.rechazo).toBeNull();
      expect(ley.rechazo).toBeNull();
    }
    expect(advierten).toEqual([40]);
  });
});

describe('sanearEstatusAvance', () => {
  it('CP-239 estatus_desconocido_rechaza: "En trámite" da rechazo', () => {
    const r = ea('En trámite', 0.3);
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-239 un estatus vacío o que no es texto también rechaza', () => {
    for (const malo of [null, undefined, '', '  ', 5]) {
      const r = ea(malo, 0.3);
      expect(r.valor).toBeNull();
      expect(r.rechazo).not.toBeNull();
    }
  });

  it('CP-239 reconoce los 9 estatus sin importar mayúsculas, acentos ni espacios', () => {
    const casos: [string, string][] = [
      ['no aplica', 'No aplica'],
      ['POR INICIAR', 'Por iniciar'],
      ['En proceso cliente', 'En proceso cliente'],
      ['en proceso  asesor', 'En proceso asesor'],
      ['En Proceso Instituto', 'En proceso Instituto'],
      [' finalizado ', 'Finalizado'],
      ['bloqueado', 'Bloqueado'],
      ['Cancelado', 'Cancelado'],
      ['detenido', 'Detenido'],
    ];
    for (const [raw, esperado] of casos) {
      expect(ea(raw, 0.5).valor?.estatus).toBe(esperado);
    }
  });

  it('CP-240 por_iniciar_avance_0_o_10_da_10: con 0 da 10 con ajuste; con 0.1 da 10 sin ajuste', () => {
    const cero = ea('Por iniciar', 0);
    expect(cero.valor).toEqual({ estatus: 'Por iniciar', avance: 10, motivo: null });
    expect(cero.ajustes.length).toBeGreaterThan(0);
    expect(cero.advertencias).toEqual([]);
    const diez = ea('Por iniciar', 0.1);
    expect(diez.valor).toEqual({ estatus: 'Por iniciar', avance: 10, motivo: null });
    expect(diez.ajustes).toEqual([]);
    expect(diez.advertencias).toEqual([]);
  });

  it('CP-240 por iniciar con otro avance (0.5) también queda en 10, con advertencia', () => {
    const r = ea('Por iniciar', 0.5);
    expect(r.valor?.avance).toBe(10);
    expect(r.advertencias).toHaveLength(1);
  });

  it('CP-241 en_proceso_rango: 0.2 da 20 y 0.9 da 90, sin advertencia', () => {
    for (const estatus of ['En proceso cliente', 'En proceso asesor', 'En proceso Instituto']) {
      const veinte = ea(estatus, 0.2);
      expect(veinte.valor?.avance).toBe(20);
      expect(veinte.advertencias).toEqual([]);
      expect(ea(estatus, 0.9).valor?.avance).toBe(90);
      expect(ea(estatus, 0.9).advertencias).toEqual([]);
    }
  });

  it('CP-241 fuera de rango: 0.1 da 20 con advertencia y 1 da 90 con advertencia', () => {
    const bajo = ea('En proceso asesor', 0.1);
    expect(bajo.valor?.avance).toBe(20);
    expect(bajo.advertencias).toHaveLength(1);
    expect(bajo.rechazo).toBeNull();
    const alto = ea('En proceso cliente', 1);
    expect(alto.valor?.avance).toBe(90);
    expect(alto.advertencias).toHaveLength(1);
    // Se lleva al valor permitido más cercano: 0 también da 20, 0.95 da 90.
    expect(ea('En proceso cliente', 0).valor?.avance).toBe(20);
    expect(ea('En proceso cliente', 0.95).valor?.avance).toBe(90);
  });

  it('CP-241 la fracción se convierte sin error de coma flotante (0.29 es 29, no 28.999)', () => {
    expect(ea('En proceso cliente', 0.29).valor?.avance).toBe(29);
    expect(ea('En proceso cliente', 0.57).valor?.avance).toBe(57);
  });

  it('CP-242 en_proceso_55_se_conserva: 0.55 da 55 con advertencia', () => {
    const r = ea('En proceso cliente', 0.55);
    expect(r.valor?.avance).toBe(55);
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-243 finalizado_siempre_100: 0.6 da 100 con advertencia; 1 da 100 sin advertencia', () => {
    const r = ea('Finalizado', 0.6);
    expect(r.valor).toEqual({ estatus: 'Finalizado', avance: 100, motivo: null });
    expect(r.advertencias).toHaveLength(1);
    const completo = ea('Finalizado', 1);
    expect(completo.valor?.avance).toBe(100);
    expect(completo.advertencias).toEqual([]);
  });

  it('CP-244 no_aplica_sin_avance: el avance es null, venga lo que venga', () => {
    for (const avance of [0, 0.5, 1, null, '']) {
      const r = ea('No aplica', avance);
      expect(r.valor).toEqual({ estatus: 'No aplica', avance: null, motivo: null });
      expect(r.rechazo).toBeNull();
    }
    expect(ea('No aplica', 0).advertencias).toEqual([]);
  });

  it('CP-245 bloqueado_pone_motivo: guarda el motivo fijo, avisa y conserva el avance', () => {
    const r = ea('Bloqueado', 0.2);
    expect(r.valor).toEqual({ estatus: 'Bloqueado', avance: 20, motivo: MOTIVO_BLOQUEO });
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-246 detenido_y_cancelado_conservan_avance: sin motivo y sin advertencia', () => {
    const det = ea('Detenido', 0.3);
    expect(det.valor).toEqual({ estatus: 'Detenido', avance: 30, motivo: null });
    expect(det.advertencias).toEqual([]);
    const can = ea('Cancelado', 0.4);
    expect(can.valor).toEqual({ estatus: 'Cancelado', avance: 40, motivo: null });
    expect(can.advertencias).toEqual([]);
    // Conservan el valor tal cual, aunque esté fuera del rango de en proceso.
    expect(ea('Cancelado', 0).valor?.avance).toBe(0);
    expect(ea('Detenido', 1).valor?.avance).toBe(100);
  });

  it('CP-246 un avance ausente o ilegible: en proceso da 20 y congelados dan 0, ambos con advertencia', () => {
    for (const malo of [null, undefined, '', 'mucho', -0.5, 250]) {
      const proceso = ea('En proceso asesor', malo);
      expect(proceso.valor?.avance).toBe(20);
      expect(proceso.advertencias).toHaveLength(1);
      const congelado = ea('Detenido', malo);
      expect(congelado.valor?.avance).toBe(0);
      expect(congelado.advertencias).toHaveLength(1);
      // Por iniciar y finalizado tienen avance fijo: no importa lo que venga.
      expect(ea('Por iniciar', malo).valor?.avance).toBe(10);
      expect(ea('Finalizado', malo).valor?.avance).toBe(100);
    }
  });

  it('CP-241 un avance ya en porcentaje (55) o texto ("50%", "0,5") se acepta', () => {
    expect(ea('En proceso cliente', 55).valor?.avance).toBe(55);
    expect(ea('En proceso cliente', '50%').valor?.avance).toBe(50);
    expect(ea('En proceso cliente', '0,5').valor?.avance).toBe(50);
  });

  it('CP-241 la coma decimal es decimal: "0,5" da 50 y "1,5" no se interpreta como fracción (150 %)', () => {
    expect(ea('En proceso cliente', '0,5').valor?.avance).toBe(50);
    expect(ea('Detenido', '0,5').valor?.avance).toBe(50);
    // "1,5" y el número 1.5 no son fracción ni porcentaje entero: se descartan (congelado da 0, no 150
    // ni 100, ni 2) y avisan.
    for (const raro of ['1,5', '1.5', 1.5]) {
      const r = ea('Detenido', raro);
      expect(r.valor?.avance).toBe(0);
      expect(r.advertencias).toHaveLength(1);
      expect(ea('En proceso cliente', raro).valor?.avance).toBe(20);
    }
  });

  it('CP-239 sobre el fixture: solo el estatus "En trámite" (ID 50) rechaza', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const estatusDe = (n: number) => COLUMNAS_OBLIGATORIAS.find((c) => c.startsWith(`${n}. `))!;
    const rechazados: unknown[] = [];
    for (const r of renglones) {
      for (let n = 0; n < 16; n++) {
        const s = ea(r.celdas[estatusDe(n)], r.celdas[`Avance${n}`]);
        if (s.rechazo !== null) rechazados.push(r.celdas['ID']);
      }
    }
    expect(rechazados).toEqual([50]);
  });
});

describe('sanearSemanas', () => {
  it('CP-310 semanas_entero_ok: 1094 da 1094 sin ajustes ni advertencias', () => {
    const r = sanearSemanas(1094);
    expect(r.valor).toBe(1094);
    expect(r.ajustes).toEqual([]);
    expect(r.advertencias).toEqual([]);
    expect(r.rechazo).toBeNull();
    expect(sanearSemanas(0).valor).toBe(0);
  });

  it('CP-310 un entero escrito como texto ("1094", " 1094 ") se acepta con ajuste', () => {
    const r = sanearSemanas(' 1094 ');
    expect(r.valor).toBe(1094);
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.advertencias).toEqual([]);
  });

  it('CP-311 semanas_texto_da_0: "N/D" da 0 con advertencia', () => {
    const r = sanearSemanas('N/D');
    expect(r.valor).toBe(0);
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-312 semanas_negativas_rechaza: -35 da rechazo (también como texto)', () => {
    const r = sanearSemanas(-35);
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
    expect(sanearSemanas('-35').rechazo).not.toBeNull();
  });

  it('CP-312 un número con decimales no es un número de semanas: rechaza', () => {
    const r = sanearSemanas(1094.5);
    expect(r.valor).toBeNull();
    expect(r.rechazo).not.toBeNull();
  });

  it('CP-310 una celda vacía da null, sin advertencia ni rechazo (el validador decide qué hacer)', () => {
    for (const vacio of [null, undefined, '', '   ']) {
      const r = sanearSemanas(vacio);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toEqual([]);
      expect(r.rechazo).toBeNull();
    }
  });

  it('CP-310 sobre el fixture: "Semanas IMSS reconocidas" rechaza solo el ID 52 y "Semanas a recuperar" advierte solo el ID 34', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const rechazados: unknown[] = [];
    const advierten: unknown[] = [];
    for (const r of renglones) {
      if (sanearSemanas(r.celdas['Semanas IMSS reconocidas']).rechazo !== null) {
        rechazados.push(r.celdas['ID']);
      }
      const a = sanearSemanas(r.celdas['Semanas a recuperar']);
      expect(a.rechazo).toBeNull();
      if (a.advertencias.length > 0) advierten.push(r.celdas['ID']);
    }
    expect(rechazados).toEqual([52]);
    expect(advierten).toEqual([34]);
  });
});
