// Modelo del formato F0 (Diagnóstico Inicial): convierte los datos del cliente en lo que se imprime en cada
// campo del formato oficial. Es una función pura (no toca la base ni el PDF) para poder probarla sola.

export interface DatosF0 {
  // Fecha de hoy en Cancún (AAAA-MM-DD): sirve para calcular la edad.
  hoy: string;
  cliente: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    referido_por: string;
    telefono: string;
    fecha_ingreso: string;
    correo_electronico: string;
    curp: string | null;
    rfc: string | null;
    nss: string | null;
    ine: string | null;
    fecha_nacimiento: string;
    sexo: string;
    estado_civil: string;
    ocupacion: string | null;
    domicilio: string;
    estado: string;
    subdelegacion_imss_probable: string;
    cambio_afore: string;
    objetivo_cliente: string;
    semanas_imss_reconocidas: number;
    observaciones_generales: string;
  };
  leyProbable: string | null;
  afore: string | null;
  asesor: string | null;
  historial: {
    semanas_issste: number;
    salario_promedio: number;
    ultimo_patron: string;
    vigencia_derechos: string;
  } | null;
  // Catálogo de objetivos específicos (objetivo_especifico_inicial) y los que el cliente tiene marcados.
  catalogoObjetivos: { id: number; nombre: string }[];
  objetivosMarcados: number[];
  // Documentos subidos y correcciones registradas, con el nombre de su tipo.
  documentos: { tipo: string; estatus: string; numero_referencia: string | null }[];
  correcciones: { tipo: string; observaciones: string | null; tiempo_promedio: string | null }[];
}

export interface ModeloF0 {
  fecha: string;
  datosGenerales: {
    nombreCompleto: string;
    telefono: string;
    correo: string;
    curp: string;
    ine: string;
    nss: string;
    rfc: string;
    fechaNacimiento: string;
    edad: string;
    ocupacion: string;
    sexo: string;
    estadoCivil: string;
    regimenImss: string;
    regimenIssste: string;
    afore: string;
    cambioAfore: string;
    domicilio: string;
    estado: string;
    subdelegacion: string;
    asesor: string;
    referidoPor: string;
  };
  documentos: {
    acta: boolean;
    curp: boolean;
    ine: boolean;
    rfc: boolean;
    comprobanteDomicilio: boolean;
    constanciaSemanas: boolean;
    numeroConstancia: string;
  };
  objetivoCliente: string;
  objetivos: { numero: number; nombre: string; marcado: boolean }[];
  correcciones: { tramite: string; observaciones: string; tiempo: string }[];
  historial: {
    semanasImss: string;
    semanasIssste: string;
    salarioPromedio: string;
    ultimoPatron: string;
    vigenciaDerechos: string;
  };
  observaciones: string;
}

const vacio = (valor: string | null | undefined): string => valor?.trim() ?? '';

// AAAA-MM-DD -> DD/MM/AAAA.
export function formatoFecha(fecha: string): string {
  const [a, m, d] = fecha.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

// Años cumplidos de `nacimiento` a `hoy` (ambas AAAA-MM-DD).
export function calcularEdad(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  const [ah, mh, dh] = hoy.split('-').map(Number);
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

// pensionarse_asap -> Pensionarse asap; casado -> Casado.
const legible = (valor: string): string =>
  valor ? valor.charAt(0).toUpperCase() + valor.slice(1).replace(/_/g, ' ') : '';

const ESTADO: Record<string, string> = { si: 'Sí', no: 'No', por_confirmar: 'Por confirmar' };
const estado = (valor: string | null | undefined): string =>
  valor ? (ESTADO[valor] ?? valor) : '';

// Ley 73 o 97 -> Régimen IMSS. Décimo Transitorio o Cuenta Individual -> Régimen ISSSTE (con las
// abreviaturas del propio formato, porque esa celda es muy angosta). Mixto o sin determinar -> en ambos.
function regimenes(ley: string | null): { imss: string; issste: string } {
  const texto = vacio(ley);
  if (texto === 'Ley 73' || texto === 'Ley 97') return { imss: texto, issste: '' };
  if (texto === 'Décimo Transitorio ISSSTE') return { imss: '', issste: 'Décimo Trans.' };
  if (texto === 'Cuenta Individual ISSSTE') return { imss: '', issste: 'Cuenta Ind.' };
  return { imss: texto, issste: texto };
}

const DOCUMENTOS = {
  acta: 'Acta de Nacimiento',
  curp: 'CURP',
  ine: 'INE',
  rfc: 'RFC',
  comprobanteDomicilio: 'Comprobante de Domicilio',
  constanciaSemanas: 'Constancia de Semanas Cotizadas (IMSS)',
} as const;

// Filas fijas de la sección 4 y el tipo de corrección que va en cada una.
const FILAS_CORRECCIONES: [fila: string, tipo: string][] = [
  ['Corrección CURP', 'Corrección de CURP'],
  ['Corrección Acta', 'Corrección de Acta de Nacimiento'],
  ['Unificación NSS', 'Unificación de NSS (Duplicidad / Multiplicidad)'],
  ['Corrección AFORE', 'Corrección de Datos en AFORE'],
  ['Actualización IMSS', 'Regularización / Actualización de Datos ante IMSS (SINDO)'],
];

const unicos = (valores: string[]): string[] => [...new Set(valores.filter((v) => v !== ''))];

export function construirModeloF0(datos: DatosF0): ModeloF0 {
  const { cliente: c, historial: h } = datos;
  const reg = regimenes(datos.leyProbable);

  // Documentación inicial: marcado si hay un documento de ese tipo que no esté en estatus "no".
  const entregado = (tipo: string) =>
    datos.documentos.some((d) => d.tipo === tipo && d.estatus !== 'no');
  const constancia = datos.documentos.find(
    (d) => d.tipo === DOCUMENTOS.constanciaSemanas && d.estatus !== 'no',
  );

  // Correcciones: 5 trámites con fila propia; todo lo demás (RFC, nombre, domicilio, "Otro"...) va en "Otro:".
  const propios = new Set(FILAS_CORRECCIONES.map(([, tipo]) => tipo));
  const filas = FILAS_CORRECCIONES.map(([tramite, tipo]) => {
    const registros = datos.correcciones.filter((r) => r.tipo === tipo);
    return {
      tramite,
      observaciones: unicos(registros.map((r) => vacio(r.observaciones))).join('; '),
      tiempo: unicos(registros.map((r) => vacio(r.tiempo_promedio))).join('; '),
    };
  });
  const otras = datos.correcciones.filter((r) => !propios.has(r.tipo));
  const nombresOtras = unicos(otras.map((r) => (r.tipo === 'Otro' ? '' : r.tipo)));
  filas.push({
    tramite: nombresOtras.length > 0 ? `Otro: ${nombresOtras.join(', ')}` : 'Otro:',
    observaciones: unicos(
      otras.map((r) => {
        const texto = vacio(r.observaciones);
        return texto !== '' && r.tipo !== 'Otro' ? `${r.tipo}: ${texto}` : texto;
      }),
    ).join('; '),
    tiempo: unicos(otras.map((r) => vacio(r.tiempo_promedio))).join('; '),
  });

  return {
    fecha: formatoFecha(c.fecha_ingreso),
    datosGenerales: {
      nombreCompleto: [c.nombre, c.apellido_paterno, c.apellido_materno]
        .map(vacio)
        .filter((p) => p !== '')
        .join(' '),
      telefono: vacio(c.telefono),
      correo: vacio(c.correo_electronico),
      curp: vacio(c.curp),
      ine: vacio(c.ine),
      nss: vacio(c.nss),
      rfc: vacio(c.rfc),
      fechaNacimiento: formatoFecha(c.fecha_nacimiento),
      edad: String(calcularEdad(c.fecha_nacimiento, datos.hoy)),
      ocupacion: vacio(c.ocupacion),
      sexo: legible(c.sexo),
      estadoCivil: legible(c.estado_civil),
      regimenImss: reg.imss,
      regimenIssste: reg.issste,
      afore: vacio(datos.afore),
      cambioAfore: estado(c.cambio_afore),
      domicilio: vacio(c.domicilio),
      estado: vacio(c.estado),
      subdelegacion: vacio(c.subdelegacion_imss_probable),
      asesor: vacio(datos.asesor),
      referidoPor: vacio(c.referido_por),
    },
    documentos: {
      acta: entregado(DOCUMENTOS.acta),
      curp: entregado(DOCUMENTOS.curp),
      ine: entregado(DOCUMENTOS.ine),
      rfc: entregado(DOCUMENTOS.rfc),
      comprobanteDomicilio: entregado(DOCUMENTOS.comprobanteDomicilio),
      constanciaSemanas: entregado(DOCUMENTOS.constanciaSemanas),
      numeroConstancia: vacio(constancia?.numero_referencia),
    },
    objetivoCliente: c.objetivo_cliente,
    // El formato numera los objetivos específicos del 2 al 13 (el 1 es el objetivo del cliente).
    objetivos: [...datos.catalogoObjetivos]
      .sort((a, b) => a.id - b.id)
      .map((o, i) => ({
        numero: i + 2,
        nombre: o.nombre,
        marcado: datos.objetivosMarcados.includes(o.id),
      })),
    correcciones: filas,
    historial: {
      semanasImss: String(c.semanas_imss_reconocidas),
      semanasIssste: h ? String(h.semanas_issste) : '',
      salarioPromedio: h
        ? `$${h.salario_promedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '',
      ultimoPatron: vacio(h?.ultimo_patron),
      vigenciaDerechos: estado(h?.vigencia_derechos),
    },
    observaciones: vacio(c.observaciones_generales),
  };
}
