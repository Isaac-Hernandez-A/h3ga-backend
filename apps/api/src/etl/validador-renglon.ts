import { MapaAsesores } from './mapa-asesores';
import { COLUMNAS_OBLIGATORIAS } from './lector-excel';
import { sanearCatalogo, sanearSemanas } from './saneadores/catalogos';
import { sanearCurp, sexoDeCurp } from './saneadores/curp';
import { sanearEstatusAvance } from './saneadores/etapa';
import { sanearFecha } from './saneadores/fecha';
import { sanearNss } from './saneadores/nss';
import { sanearRfc } from './saneadores/rfc';
import {
  dividirNombre,
  limpiarTexto,
  sanearCorreo,
  sanearNombre,
  sanearTelefono,
} from './saneadores/texto';
import {
  DatosCliente,
  DatosEtapa,
  EstadoCivilDb,
  EstadoConfirmacionDb,
  RenglonCrudo,
  RenglonValidado,
  Saneado,
  TOTAL_ETAPAS,
} from './tipos';

// Validador de renglón (Actividad 5, Tarea 8): compone los saneadores sobre un renglón crudo y devuelve el
// cliente listo para cargar, o sus rechazos. Acumula todos los motivos (no se detiene en el primero). Cada
// mensaje empieza con la columna de origen. Ningún mensaje incluye CURP ni NSS.
export interface ContextoValidacion {
  hoy: Date;
  asesores: MapaAsesores;
}

const PENDIENTE = 'Pendiente de captura';

const estatusDe = (n: number): string => COLUMNAS_OBLIGATORIAS.find((c) => c.startsWith(`${n}. `))!;

// Texto libre (referidor, observaciones, acción): sin espacios de más. Número o texto; otro tipo, vacío.
const textoLibre = (raw: unknown): string =>
  typeof raw === 'string' || typeof raw === 'number' ? limpiarTexto(String(raw)).texto : '';

export async function validarRenglon(
  crudo: RenglonCrudo,
  ctx: ContextoValidacion,
): Promise<RenglonValidado> {
  const celdas = crudo.celdas;
  const ajustes: string[] = [];
  const advertencias: string[] = [];
  const rechazos: string[] = [];

  // Anota los mensajes de un saneador con su columna de origen y devuelve el valor.
  const tomar = <T>(columna: string, s: Saneado<T>, opciones: { sinAjustes?: boolean } = {}) => {
    if (!opciones.sinAjustes) ajustes.push(...s.ajustes.map((m) => `${columna}: ${m}`));
    advertencias.push(...s.advertencias.map((m) => `${columna}: ${m}`));
    if (s.rechazo) rechazos.push(`${columna}: ${s.rechazo}`);
    return s.valor;
  };

  // Nombre único del Excel a nombre y dos apellidos (una sola palabra rechaza).
  let nombre = '';
  let apellidoPaterno = '';
  let apellidoMaterno = '';
  const nombreLimpio = tomar('Nombre del cliente', sanearNombre(celdas['Nombre del cliente']));
  if (nombreLimpio !== null) {
    const partes = dividirNombre(nombreLimpio);
    if (partes.apellidoPaterno === '') {
      rechazos.push('Nombre del cliente: trae una sola palabra, faltan los apellidos.');
    } else {
      ({ nombre, apellidoPaterno, apellidoMaterno } = partes);
      ajustes.push('Nombre del cliente: nombre_dividido');
    }
  }

  const referidoPor = textoLibre(celdas['Referidor']);
  if (referidoPor === '') {
    advertencias.push('Referidor: referidor_vacio: el Excel no trae referidor y se carga vacío.');
  }
  const telefono = tomar('Teléfono', sanearTelefono(celdas['Teléfono'])) ?? '';
  const correoElectronico = tomar('Email', sanearCorreo(celdas['Email'])) ?? '';
  const observacionesGenerales = textoLibre(celdas['Observaciones generales']);

  const asesor = await ctx.asesores.resolver(celdas['Asesor']);
  let asesorId = '';
  if ('rechazo' in asesor) rechazos.push(`Asesor: ${asesor.rechazo}`);
  else asesorId = asesor.usuarioId;

  const fechaIngreso = tomar(
    'Fecha ingreso',
    sanearFecha(celdas['Fecha ingreso'], { tipo: 'ingreso', hoy: ctx.hoy }),
  );
  const fechaNacimiento = tomar(
    'Fecha de nacimiento',
    sanearFecha(celdas['Fecha de nacimiento'], { tipo: 'nacimiento', hoy: ctx.hoy }),
  );

  const curp = tomar('CURP', sanearCurp(celdas['CURP'], fechaNacimiento));
  const rfc = tomar('RFC', sanearRfc(celdas['RFC']));

  const regimen = tomar(
    'Régimen seguridad social',
    sanearCatalogo(celdas['Régimen seguridad social'], 'regimen'),
  );
  const nss = tomar('NSS', sanearNss(celdas['NSS'], regimen));
  const leyProbable = tomar('Ley probable', sanearCatalogo(celdas['Ley probable'], 'ley'));
  const afore = tomar('AFORE', sanearCatalogo(celdas['AFORE'], 'afore'));
  // El estado civil del Excel ("Soltero (a)") es una equivalencia estándar con el enum, no un ajuste.
  const estadoCivil = tomar('Estado civil', sanearCatalogo(celdas['Estado civil'], 'estadoCivil'), {
    sinAjustes: true,
  });

  const dependientes = celdas['Dependientes económicos'];
  let dependientesEconomicos = 0;
  if (typeof dependientes === 'number' && Number.isInteger(dependientes) && dependientes >= 0) {
    dependientesEconomicos = dependientes;
  } else if (typeof dependientes === 'string' && /^\s*\d+\s*$/.test(dependientes)) {
    dependientesEconomicos = Number(dependientes);
    ajustes.push('Dependientes económicos: dependientes_de_texto');
  } else {
    rechazos.push('Dependientes económicos: debe ser un número entero de 0 en adelante.');
  }

  let semanasImssReconocidas = tomar(
    'Semanas IMSS reconocidas',
    sanearSemanas(celdas['Semanas IMSS reconocidas']),
  );
  if (
    semanasImssReconocidas === null &&
    !rechazos.some((m) => m.startsWith('Semanas IMSS reconocidas'))
  ) {
    semanasImssReconocidas = 0;
    advertencias.push(
      'Semanas IMSS reconocidas: semanas_vacias: el Excel no trae semanas y se cargan en 0.',
    );
  }
  const semanasARecuperar = tomar(
    'Semanas a recuperar',
    sanearSemanas(celdas['Semanas a recuperar']),
  );

  const tieneIssste = confirmacion('¿Tiene ISSSTE?', celdas['¿Tiene ISSSTE?'], advertencias);
  const requiereContadora = confirmacion(
    'Requiere contadora',
    celdas['Requiere contadora'],
    advertencias,
  );

  // Las 16 etapas.
  const etapas: DatosEtapa[] = [];
  for (let n = 0; n < TOTAL_ETAPAS; n++) {
    const etiqueta = `Etapa ${n}`;
    const sufijo = n === 0 ? '' : String(n);
    const ea = tomar(etiqueta, sanearEstatusAvance(celdas[estatusDe(n)], celdas[`Avance${n}`]));
    const fecha = tomar(
      etiqueta,
      sanearFecha(celdas[`Fecha compromiso${sufijo}`], { tipo: 'compromiso', hoy: ctx.hoy }),
    );
    const accion = n === 0 ? '' : textoLibre(celdas[`Acción a realizar${n}`]);
    if (ea) {
      etapas.push({
        numeroPaso: n,
        estatus: ea.estatus,
        avance: ea.avance,
        accion: accion === '' ? null : accion,
        fechaCompromiso: fecha,
        motivoRechazo: ea.motivo,
      });
    }
  }

  const idCelda = celdas['ID'];
  const idExcel = typeof idCelda === 'number' && Number.isInteger(idCelda) ? idCelda : null;

  if (rechazos.length > 0) {
    return { fila: crudo.fila, idExcel, datos: null, ajustes, advertencias, rechazos };
  }

  // Campos obligatorios que el Excel no trae (sección 15 de la especificación).
  advertencias.push(
    'campos_pendientes_de_captura: domicilio, estado y subdelegación IMSS se cargan como "Pendiente de captura" y el cambio de AFORE por confirmar.',
  );
  advertencias.push(
    'objetivo_asumido: el Excel no trae el objetivo del cliente; se asume pensionarse_asap para que el asesor lo confirme.',
  );

  const datos: DatosCliente = {
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    referidoPor,
    telefono,
    correoElectronico,
    observacionesGenerales,
    asesorId,
    fechaIngreso: fechaIngreso!,
    fechaNacimiento: fechaNacimiento!,
    curp: curp!,
    rfc,
    nss,
    sexo: sexoDeCurp(curp!) === 'M' ? 'mujer' : 'hombre',
    estadoCivil: estadoCivil as EstadoCivilDb,
    dependientesEconomicos,
    regimen: regimen!,
    leyProbable: leyProbable!,
    afore: afore!,
    semanasImssReconocidas: semanasImssReconocidas!,
    semanasARecuperar,
    tieneIssste,
    requiereContadora,
    domicilio: PENDIENTE,
    estado: PENDIENTE,
    subdelegacionImssProbable: PENDIENTE,
    cambioAfore: 'por_confirmar',
    objetivoCliente: 'pensionarse_asap',
    etapas,
  };
  return { fila: crudo.fila, idExcel, datos, ajustes, advertencias, rechazos };
}

// Sí / No / Por confirmar a si / no / por_confirmar. Vacío o desconocido da por_confirmar (el valor
// neutro del enum) con advertencia.
function confirmacion(columna: string, raw: unknown, advertencias: string[]): EstadoConfirmacionDb {
  const clave =
    typeof raw === 'string'
      ? raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
      : '';
  if (clave === 'si') return 'si';
  if (clave === 'no') return 'no';
  if (clave !== 'por confirmar') {
    advertencias.push(
      `${columna}: confirmacion_desconocida: no es Sí, No ni Por confirmar; se carga por confirmar.`,
    );
  }
  return 'por_confirmar';
}
