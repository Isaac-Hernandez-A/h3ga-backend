import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ReporteEtl } from '../../etl/tipos';
import { armarMarkdown, leerCsv, leerDefectos, resultadoDe } from './defectos';

// Ayudante de la comparación defectos contra resultado (Actividad 5, Tarea 13). Sin base de datos.
const CSV = resolve(__dirname, '../../../../../test/fixtures/etl/defectos-sembrados.csv');

const renglon = (
  id: number,
  cambios: Partial<ReporteEtl['renglones'][number]> = {},
): ReporteEtl['renglones'][number] => ({
  fila: id + 5,
  idExcel: id,
  clase: 'cargado',
  curp: null,
  nss: null,
  ajustes: [],
  advertencias: [],
  rechazos: [],
  ...cambios,
});

describe('defectos.ts', () => {
  it('CP-303 leerCsv respeta comillas, comas, saltos de línea y BOM', () => {
    expect(leerCsv(String.fromCharCode(0xfeff) + 'a,b\r\n1,"x, ""y"""\n"2\nlinea",z\n')).toEqual([
      ['a', 'b'],
      ['1', 'x, "y"'],
      ['2\nlinea', 'z'],
    ]);
  });

  it('CP-303 el catálogo del fixture trae 36 defectos (25 renglones) con sus clases', () => {
    const defectos = leerDefectos(readFileSync(CSV, 'utf8'));
    expect(defectos).toHaveLength(36);
    const clases = (c: string) => defectos.filter((d) => d.clase === c).length;
    expect([
      clases('saneable'),
      clases('advertencia'),
      clases('rechazo'),
      clases('duplicado'),
    ]).toEqual([20, 4, 8, 2]);
    expect(clases('posible duplicado')).toBe(2);
    expect(defectos[0]).toMatchObject({ id: 3, fila: 8, columna: 'B', clase: 'saneable' });
  });

  it('CP-303 cada clase se compara con su criterio', () => {
    const base = {
      id: 1,
      fila: 6,
      columna: 'B',
      etapa: '',
      valorLimpio: '',
      valorSembrado: '',
      defecto: 'd',
    };
    const d = (clase: string) => ({ ...base, clase }) as never;
    expect(
      resultadoDe(d('saneable'), renglon(1, { ajustes: ['Teléfono: telefono_normalizado'] }))
        .coincide,
    ).toBe(true);
    expect(
      resultadoDe(d('saneable'), renglon(1, { ajustes: ['Nombre del cliente: nombre_dividido'] }))
        .resultado,
    ).toMatch(/silenciosa/);
    expect(
      resultadoDe(d('saneable'), renglon(1, { clase: 'rechazado', rechazos: ['x'] })).coincide,
    ).toBe(false);
    expect(
      resultadoDe(d('advertencia'), renglon(1, { advertencias: ['objetivo_asumido: x'] })).coincide,
    ).toBe(false);
    expect(
      resultadoDe(
        d('advertencia'),
        renglon(1, { advertencias: ['Ley probable: ley_desconocido: x'] }),
      ).coincide,
    ).toBe(true);
    expect(
      resultadoDe(d('rechazo'), renglon(1, { clase: 'rechazado', rechazos: ['CURP: formato'] }))
        .coincide,
    ).toBe(true);
    expect(resultadoDe(d('rechazo'), renglon(1)).coincide).toBe(false);
    expect(
      resultadoDe(
        d('duplicado'),
        renglon(1, { clase: 'rechazado', rechazos: ['CURP duplicado en el archivo: fila 17.'] }),
      ).coincide,
    ).toBe(true);
    expect(
      resultadoDe(
        d('duplicado'),
        renglon(1, { clase: 'rechazado', rechazos: ['CURP ya existe en la base.'] }),
      ).coincide,
    ).toBe(false);
    expect(
      resultadoDe(
        d('posible duplicado'),
        renglon(1, { advertencias: ['posible_duplicado: fila 9'] }),
      ).coincide,
    ).toBe(true);
    expect(resultadoDe(d('saneable'), undefined).coincide).toBe(false);
  });

  it('CP-303 el markdown enmascara CURP y NSS y marca lo que no coincide', () => {
    const defectos = leerDefectos(readFileSync(CSV, 'utf8')).slice(0, 12);
    const reporte = {
      cabecera: { archivo: 'x.xlsx', huellaSha256: 'abc' },
      totales: { leidos: 1, cargados: 0, rechazados: 1, duplicadosEnArchivo: 0 },
      renglones: [renglon(10, { ajustes: ['CURP: curp_normalizada'] })],
    } as unknown as ReporteEtl;
    const md = armarMarkdown(defectos, reporte);
    expect(md).toContain('| 10 | 15 | G |');
    expect(md).not.toContain('mmar610609hdfrnf68');
    expect(md).toMatch(/•{14}nf68/i);
    expect(md).toContain('| NO |');
    expect(md).toContain('| Sí |');
  });
});
