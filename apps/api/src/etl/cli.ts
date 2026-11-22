import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DataSource } from 'typeorm';
import { ROL_ID } from '../common/auth/roles-sistema';
import { EtlService } from './etl.service';
import { cargarEquivalencias } from './equivalencias';
import { ArchivoInvalidoError } from './lector-excel';
import { escribirReporte, subcarpetaDeCorrida } from './reporte';

// Comando de línea de la importación (Actividad 5, Tarea 12): pnpm etl:importar. Arranca el contexto de
// NestJS sin HTTP y usa el mismo EtlService que el endpoint. Exige un Supervisor existente y activo como
// ejecutor (consta en el reporte y en los logs). Nunca imprime CURP ni NSS: solo totales, filas y motivos.
//
// Códigos de salida: 0 todo bien (aunque haya renglones rechazados); 1 error de uso, de archivo, de
// configuración o de ejecutor; 2 la conciliación falló.
export interface SalidaCli {
  out: (texto: string) => void;
  err: (texto: string) => void;
}

const USO = `Uso: pnpm etl:importar --archivo ruta.xlsx --ejecutor correo-del-supervisor [--simulacro] [--lote 25] [--equivalencias ruta.json] [--salida carpeta]
  --archivo        libro de Excel (.xlsx) con la hoja Clientes (obligatorio)
  --ejecutor       correo de un Supervisor activo, responsable de la corrida (obligatorio)
  --simulacro      ejecuta todo sin guardar nada en la base
  --lote           renglones por transacción (por defecto 25)
  --equivalencias  JSON nombre del asesor en el Excel a correo (por defecto, la variable ETL_EQUIVALENCIAS; acepta la ruta o el contenido del JSON)
  --salida         carpeta donde se escriben reporte.json y rechazados.csv
                   (por defecto, una subcarpeta propia de ETL_SALIDA, o ./etl-salida)`;

const salidaEstandar: SalidaCli = {
  out: (texto) => void process.stdout.write(`${texto}\n`),
  err: (texto) => void process.stderr.write(`${texto}\n`),
};

export async function ejecutarCli(
  argv: string[],
  salida: SalidaCli = salidaEstandar,
): Promise<number> {
  const uso = (mensaje: string) => {
    salida.err(`Error: ${mensaje}\n${USO}`);
    return 1;
  };

  // `pnpm etl:importar -- --archivo ...` puede dejar un "--" inicial: se ignora.
  const argumentos = argv[0] === '--' ? argv.slice(1) : argv;
  let opciones;
  try {
    opciones = parseArgs({
      args: argumentos,
      allowPositionals: false,
      options: {
        archivo: { type: 'string' },
        ejecutor: { type: 'string' },
        simulacro: { type: 'boolean' },
        lote: { type: 'string' },
        equivalencias: { type: 'string' },
        salida: { type: 'string' },
      },
    }).values;
  } catch {
    return uso('opción desconocida o sin valor.');
  }

  const faltan = (['archivo', 'ejecutor'] as const)
    .filter((o) => !opciones[o]?.trim())
    .map((o) => `--${o}`);
  if (faltan.length > 0) return uso(`falta ${faltan.join(' y ')}.`);

  let tamanoLote = 25;
  if (opciones.lote !== undefined) {
    if (!/^\d+$/.test(opciones.lote) || Number(opciones.lote) < 1) {
      return uso('--lote debe ser un entero positivo.');
    }
    tamanoLote = Number(opciones.lote);
  }

  const rutaEquivalencias = opciones.equivalencias?.trim() || process.env.ETL_EQUIVALENCIAS?.trim();
  if (!rutaEquivalencias) {
    return uso(
      'falta --equivalencias (o la variable ETL_EQUIVALENCIAS) con el JSON de equivalencias.',
    );
  }
  let equivalencias: Record<string, string>;
  try {
    equivalencias = await cargarEquivalencias(rutaEquivalencias);
  } catch {
    return uso(
      'no se pudo leer el JSON de equivalencias (nombre del asesor en el Excel a correo).',
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(opciones.archivo!);
  } catch {
    return uso('no se pudo leer el archivo indicado en --archivo.');
  }

  // El contexto se arranca después de validar los argumentos: un error de uso no toca la base.
  let app;
  try {
    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../app.module');
    app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  } catch {
    salida.err(
      'Error: no se pudo iniciar la aplicación (revise DATABASE_URL y que la base esté disponible).',
    );
    return 1;
  }

  try {
    const filas = await app
      .get(DataSource)
      .query<{ id: string; activo: boolean; rol_id: number }[]>(
        `SELECT id, activo, rol_id FROM usuarios WHERE lower(correo_electronico) = lower($1) LIMIT 1`,
        [opciones.ejecutor!.trim()],
      );
    const ejecutor = filas[0];
    if (!ejecutor?.activo || ejecutor.rol_id !== ROL_ID.supervisor) {
      salida.err('Error: el ejecutor no existe, está inactivo o no es Supervisor.');
      return 1;
    }

    const simulacro = opciones.simulacro ?? false;
    let reporte;
    try {
      reporte = await app.get(EtlService, { strict: false }).importar(buffer, {
        nombreArchivo: basename(opciones.archivo!),
        ejecutorId: ejecutor.id,
        modo: 'comando',
        equivalencias,
        simulacro,
        tamanoLote,
      });
    } catch (error) {
      salida.err(
        error instanceof ArchivoInvalidoError
          ? `Error: ${error.message}`
          : 'Error inesperado durante la importación; revise los logs.',
      );
      return 1;
    }

    // --salida se usa tal cual; sin ella, una subcarpeta propia de ETL_SALIDA.
    const carpeta = opciones.salida?.trim()
      ? resolve(opciones.salida)
      : resolve(
          process.env.ETL_SALIDA || 'etl-salida',
          subcarpetaDeCorrida(reporte.cabecera.huellaSha256),
        );
    const t = reporte.totales;
    salida.out(
      `Importación terminada${simulacro ? ' (simulacro: no se guardó nada en la base)' : ''}.`,
    );
    salida.out(`Archivo: ${reporte.cabecera.archivo}`);
    salida.out(
      `Leídos: ${t.leidos} | Cargados: ${t.cargados} | Rechazados: ${t.rechazados} (duplicados en el archivo: ${t.duplicadosEnArchivo}, ya existían: ${t.yaExistian})`,
    );
    salida.out(
      `Con ajustes: ${t.conAjustes} | Con advertencias: ${t.conAdvertencias} | Lotes: ${t.lotes} (degradados: ${t.lotesDegradados})`,
    );
    if (t.renglonesVaciosIgnorados > 0) {
      salida.out(`Renglones vacíos ignorados (restos de fórmulas): ${t.renglonesVaciosIgnorados}`);
    }
    salida.out(
      `Conciliación: ${reporte.conciliacion.ok ? 'correcta' : 'FALLÓ'}. ${reporte.conciliacion.detalle}`,
    );
    for (const r of reporte.renglones.filter((x) => x.clase === 'rechazado')) {
      salida.out(`Rechazado: fila ${r.fila} (ID ${r.idExcel ?? '?'}): ${r.rechazos.join(' | ')}`);
    }
    try {
      await escribirReporte(carpeta, reporte);
      salida.out(`Reporte: ${carpeta}`);
    } catch {
      salida.err(`Error: no se pudo escribir el reporte en ${carpeta}.`);
      return 1;
    }
    if (!reporte.conciliacion.ok) {
      salida.err('Error: la conciliación no coincide; revise el reporte.');
      return 2;
    }
    return 0;
  } finally {
    await app.close();
  }
}
