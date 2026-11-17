import { Injectable, NotImplementedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ROL_POR_ID } from '../common/auth/roles-sistema';
import { CargadorClientes } from './cargador';
import { ImportarExcelDto } from './dto/importar-excel.dto';
import { marcarDuplicados } from './duplicados';
import { COLUMNAS_OBLIGATORIAS, leerHojaClientes } from './lector-excel';
import { MapaAsesores, UsuariosLookup } from './mapa-asesores';
import { codigoDe, enmascarar, esRutinario } from './reporte';
import { RenglonValidado, ReporteEtl } from './tipos';
import { validarRenglon } from './validador-renglon';

export interface OpcionesImportacion {
  nombreArchivo: string;
  ejecutorId: string;
  modo: 'api' | 'comando';
  // Nombre del asesor en el Excel a correo de su usuario (equivalencias-asesores.json).
  equivalencias: Record<string, string>;
  simulacro?: boolean;
  tamanoLote?: number; // 25 por defecto
  // Fecha de referencia para validar fechas (por defecto, hoy). Se inyecta en las pruebas.
  hoy?: Date;
}

// Columnas del Excel que no se cargan, con el motivo. Los documentos (CJ a CO) se detectan por no ser
// columnas obligatorias.
const NO_MIGRADAS_FIJAS: { columna: string; motivo: string }[] = [
  {
    columna: 'ID',
    motivo: 'Solo identifica el renglón en el reporte; el sistema genera su propio id.',
  },
  {
    columna: 'Edad',
    motivo: 'Es una fórmula del Excel (DATEDIF); se recalcula a partir de la fecha de nacimiento.',
  },
  {
    columna: 'Días desde alta',
    motivo: 'Es una fórmula del Excel; se recalcula a partir de la fecha de ingreso.',
  },
  {
    columna: 'Fecha compromiso total',
    motivo: 'Es una fórmula del Excel (máximo de las fechas compromiso); se recalcula.',
  },
];
const MOTIVO_DOCUMENTO = 'Cotejo de documento: los documentos no se migran en esta etapa.';

const REGEX_DUPLICADO_ARCHIVO = /duplicado en el archivo/i;
const REGEX_YA_EXISTE = /ya existe/i;

@Injectable()
export class EtlService {
  constructor(
    private readonly ds: DataSource,
    private readonly cargador: CargadorClientes,
  ) {}

  // Orquesta una importación: lee la hoja, valida cada renglón, detecta duplicados (en el archivo y en la
  // base), carga por lotes (o simula) y arma el reporte con la conciliación. Si el archivo no se puede
  // leer lanza ArchivoInvalidoError y no toca la base.
  async importar(buffer: Buffer, opciones: OpcionesImportacion): Promise<ReporteEtl> {
    const inicio = new Date();
    const simulacro = opciones.simulacro ?? false;
    const huellaSha256 = createHash('sha256').update(buffer).digest('hex');

    const { encabezados, renglones } = await leerHojaClientes(buffer);
    const asesores = new MapaAsesores(opciones.equivalencias, this.usuariosPorCorreo());
    const hoy = opciones.hoy ?? new Date();
    const validados: RenglonValidado[] = [];
    for (const crudo of renglones) validados.push(await validarRenglon(crudo, { hoy, asesores }));

    const finales = marcarDuplicados(validados, await this.existentes(validados));

    const resultado = await this.cargador.cargarLotes(
      finales.filter((r) => r.datos !== null),
      {
        tamanoLote: opciones.tamanoLote ?? 25,
        simulacro,
        ejecutorId: opciones.ejecutorId,
      },
    );
    // Lo que la base rechazó al cargar (por ejemplo, una CURP repetida por una carga simultánea).
    const motivoDeCarga = new Map(resultado.rechazados.map((x) => [x.fila, x.motivo]));
    const tras = finales.map((r) =>
      motivoDeCarga.has(r.fila)
        ? { ...r, datos: null, rechazos: [...r.rechazos, motivoDeCarga.get(r.fila)!] }
        : r,
    );

    const esCargado = (r: RenglonValidado) => r.rechazos.length === 0;
    const cargados = tras.filter(esCargado);
    const rechazados = tras.filter((r) => !esCargado(r));

    const conciliacion = await this.conciliar(
      renglones.length,
      resultado.cargados,
      rechazados.length,
      simulacro,
    );

    const resumenPorCodigo: Record<string, number> = {};
    for (const r of cargados) {
      const codigos = new Set(
        [...r.ajustes, ...r.advertencias].map(codigoDe).filter((c): c is string => c !== null),
      );
      for (const codigo of codigos) resumenPorCodigo[codigo] = (resumenPorCodigo[codigo] ?? 0) + 1;
    }
    const conAlgo = (r: RenglonValidado, lista: 'ajustes' | 'advertencias') =>
      r[lista].some((m) => !esRutinario(m));
    const con = (r: RenglonValidado, codigo: string) =>
      r.advertencias.some((m) => m.includes(codigo));

    return {
      cabecera: {
        archivo: opciones.nombreArchivo,
        huellaSha256,
        modo: opciones.modo,
        ejecutor: opciones.ejecutorId,
        simulacro,
        inicio: inicio.toISOString(),
        fin: new Date().toISOString(),
      },
      totales: {
        leidos: renglones.length,
        cargados: cargados.length,
        rechazados: rechazados.length,
        duplicadosEnArchivo: rechazados.filter((r) =>
          r.rechazos.some((m) => REGEX_DUPLICADO_ARCHIVO.test(m)),
        ).length,
        yaExistian: rechazados.filter((r) => r.rechazos.some((m) => REGEX_YA_EXISTE.test(m)))
          .length,
        conAdvertencias: cargados.filter((r) => conAlgo(r, 'advertencias')).length,
        conAjustes: cargados.filter((r) => conAlgo(r, 'ajustes')).length,
        lotes: resultado.lotes,
        lotesDegradados: resultado.lotesDegradados,
        pendientesDeCaptura: cargados.filter((r) => con(r, 'campos_pendientes_de_captura')).length,
        objetivoAsumido: cargados.filter((r) => con(r, 'objetivo_asumido')).length,
      },
      conciliacion,
      resumenPorCodigo,
      renglones: tras.map((r, i) => ({
        fila: r.fila,
        idExcel: r.idExcel,
        clase: esCargado(r) ? ('cargado' as const) : ('rechazado' as const),
        curp: enmascararDato(r.datos?.curp ?? renglones[i].celdas['CURP'], true),
        nss: enmascararDato(r.datos?.nss ?? renglones[i].celdas['NSS'], false),
        ajustes: r.ajustes,
        advertencias: r.advertencias,
        rechazos: r.rechazos,
      })),
      nombresDivididos: cargados.map(
        (r) =>
          `Fila ${r.fila}: ${[r.datos!.nombre, r.datos!.apellidoPaterno, r.datos!.apellidoMaterno]
            .filter(Boolean)
            .join(' / ')}`,
      ),
      columnasNoMigradas: [
        ...NO_MIGRADAS_FIJAS,
        ...encabezados
          .filter((e) => !COLUMNAS_OBLIGATORIAS.includes(e))
          .map((columna) => ({ columna, motivo: MOTIVO_DOCUMENTO })),
      ],
    };
  }

  // Esbozo anterior del endpoint; la Tarea 11 lo reemplaza.
  async importarExcel(dto: ImportarExcelDto): Promise<unknown> {
    throw new NotImplementedException();
  }

  private usuariosPorCorreo(): UsuariosLookup {
    return {
      buscarPorCorreo: async (correo) => {
        const filas = await this.ds.query<{ id: string; activo: boolean; rol_id: number }[]>(
          `SELECT id, activo, rol_id FROM usuarios WHERE lower(correo_electronico) = lower($1) LIMIT 1`,
          [correo],
        );
        if (filas.length === 0) return null;
        const { id, activo, rol_id } = filas[0];
        return { id, activo, rol: ROL_POR_ID[rol_id] ?? 'auxiliar' };
      },
    };
  }

  // CURP y NSS que ya están en la base, solo de los renglones del archivo.
  private async existentes(validados: RenglonValidado[]) {
    const curps = validados.flatMap((r) => (r.datos ? [r.datos.curp] : []));
    const nss = validados.flatMap((r) => (r.datos?.nss ? [r.datos.nss] : []));
    const enBase = async (columna: 'curp' | 'nss', valores: string[]) =>
      new Set(
        valores.length === 0
          ? []
          : (
              await this.ds.query<Record<string, string>[]>(
                `SELECT ${columna} FROM clientes WHERE ${columna} = ANY($1)`,
                [valores],
              )
            ).map((f) => f[columna]),
      );
    return { curps: await enBase('curp', curps), nss: await enBase('nss', nss) };
  }

  // leídos = cargados + rechazados y, si no es simulacro, la base tiene exactamente las CURP cargadas.
  private async conciliar(
    leidos: number,
    curpsCargadas: string[],
    rechazados: number,
    simulacro: boolean,
  ): Promise<{ ok: boolean; detalle: string }> {
    const cuadra = leidos === curpsCargadas.length + rechazados;
    const cuenta = `leídos ${leidos} = cargados ${curpsCargadas.length} + rechazados ${rechazados}`;
    if (simulacro) {
      return {
        ok: cuadra,
        detalle: `Simulacro: no se consultó la base. ${cuadra ? 'Cuadra' : 'No coincide'}: ${cuenta}.`,
      };
    }
    const enBase =
      curpsCargadas.length === 0
        ? 0
        : Number(
            (
              await this.ds.query<{ n: string }[]>(
                `SELECT count(*) AS n FROM clientes WHERE curp = ANY($1)`,
                [curpsCargadas],
              )
            )[0].n,
          );
    const ok = cuadra && enBase === curpsCargadas.length;
    return {
      ok,
      detalle: `${ok ? 'Cuadra' : 'No coincide'}: ${cuenta}; en la base se encontraron ${enBase} de ${curpsCargadas.length} CURP cargadas.`,
    };
  }
}

// CURP o NSS enmascarados (últimos 4); null si el renglón no trae el dato.
function enmascararDato(valor: unknown, esCurp: boolean): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const texto = String(valor).replace(/[\s-]/g, '');
  return texto === '' ? null : enmascarar(esCurp ? texto.toUpperCase() : texto);
}
