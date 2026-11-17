import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { marcarDuplicados } from './duplicados';
import { COLUMNAS_OBLIGATORIAS, leerHojaClientes } from './lector-excel';
import { MapaAsesores, UsuarioBuscado } from './mapa-asesores';
import { RenglonValidado } from './tipos';
import { validarRenglon } from './validador-renglon';

// Validador de renglón y duplicados (Actividad 5, Tarea 8). Datos ficticios.
const DIR = resolve(__dirname, '../../../../test/fixtures/etl');
const FIXTURE = resolve(DIR, 'FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx');
const EQUIVALENCIAS = JSON.parse(
  readFileSync(resolve(DIR, 'equivalencias-asesores.json'), 'utf8'),
) as Record<string, string>;

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const HOY = utc(2026, 11, 16);

const USUARIOS: Record<string, UsuarioBuscado> = {
  'marco.hernandez@ejemplo.test': { id: 'uuid-marco', activo: true, rol: 'asesor' },
  'ana.hernandez@ejemplo.test': { id: 'uuid-ana', activo: true, rol: 'asesor' },
};
const asesores = () =>
  new MapaAsesores(EQUIVALENCIAS, {
    buscarPorCorreo: (correo) => Promise.resolve(USUARIOS[correo] ?? null),
  });
const ctx = () => ({ hoy: HOY, asesores: asesores() });

const CURP_A = 'HOUW700909MNLTWL04';
const CURP_B = 'MIAR610609HDFRNF68';
const NSS_A = '99033042845';
const NSS_B = '99346352136';
const NSS_C = '99446026195';

const estatusDe = (n: number) => COLUMNAS_OBLIGATORIAS.find((c) => c.startsWith(`${n}. `))!;

// Un renglón limpio, armado a mano con las 87 columnas obligatorias más las 3 fórmulas.
function celdasLimpias(): Record<string, unknown> {
  const celdas: Record<string, unknown> = {
    ID: 1,
    'Nombre del cliente': 'Leticia May Uc',
    Referidor: 'Instagram',
    Teléfono: '9876628360',
    Asesor: 'Lic. Marco Hernández',
    'Fecha ingreso': utc(2025, 1, 17),
    CURP: CURP_A,
    'Fecha de nacimiento': utc(1970, 9, 9),
    Edad: 56,
    'Estado civil': 'Casado (a)',
    'Dependientes económicos': 2,
    RFC: 'HOUW700909AB1',
    Email: 'leticia.may@ejemplo.test',
    'Régimen seguridad social': 'IMSS',
    NSS: NSS_A,
    'Ley probable': 'Ley 73',
    'Semanas IMSS reconocidas': 1094,
    'Semanas a recuperar': 200,
    '¿Tiene ISSSTE?': 'No',
    AFORE: 'Sura',
    'Días desde alta': 668,
    'Fecha compromiso total': 46000,
    'Observaciones generales': null,
    'Requiere contadora': 'No',
  };
  for (let n = 0; n < 16; n++) {
    const sufijo = n === 0 ? '' : String(n);
    celdas[estatusDe(n)] =
      n === 0
        ? 'Finalizado'
        : n === 1
          ? 'En proceso asesor'
          : n === 15
            ? 'Por iniciar'
            : 'No aplica';
    celdas[`Fecha compromiso${sufijo}`] =
      n === 0 ? utc(2025, 2, 1) : n === 1 ? utc(2025, 4, 2) : null;
    celdas[`Avance${n}`] = n === 0 ? 1 : n === 1 ? 0.4 : n === 15 ? 0.1 : 0;
    if (n > 0) {
      celdas[`Acción a realizar${n}`] = n === 1 ? '  Elaborar diagnóstico especializado ' : null;
    }
  }
  return celdas;
}

const validar = (cambios: Record<string, unknown> = {}, fila = 6) =>
  validarRenglon({ fila, celdas: { ...celdasLimpias(), ...cambios } }, ctx());

const texto = (r: RenglonValidado) => JSON.stringify([r.ajustes, r.advertencias, r.rechazos]);

describe('validarRenglon', () => {
  it('CP-253 renglon_limpio: sin rechazos; solo trae las marcas estructurales de siempre', async () => {
    const r = await validar();
    expect(r.rechazos).toEqual([]);
    expect(r.datos).not.toBeNull();
    expect(r.idExcel).toBe(1);
    expect(r.fila).toBe(6);
    // Las únicas advertencias son las de los campos que el Excel no trae (CP-313 y CP-314).
    expect(r.advertencias).toHaveLength(2);
    expect(r.advertencias.join(' ')).toContain('campos_pendientes_de_captura');
    expect(r.advertencias.join(' ')).toContain('objetivo_asumido');
    // El único ajuste es dividir el nombre único del Excel (spec sección 15).
    expect(r.ajustes).toHaveLength(1);
    expect(r.ajustes[0]).toContain('nombre_dividido');
  });

  it('CP-253 los datos del cliente quedan saneados y completos', async () => {
    const { datos } = await validar();
    expect(datos).toMatchObject({
      nombre: 'Leticia',
      apellidoPaterno: 'May',
      apellidoMaterno: 'Uc',
      referidoPor: 'Instagram',
      telefono: '9876628360',
      correoElectronico: 'leticia.may@ejemplo.test',
      observacionesGenerales: '',
      asesorId: 'uuid-marco',
      curp: CURP_A,
      rfc: 'HOUW700909AB1',
      nss: NSS_A,
      sexo: 'mujer',
      estadoCivil: 'casado',
      dependientesEconomicos: 2,
      regimen: 'IMSS',
      leyProbable: 'Ley 73',
      afore: 'Sura',
      semanasImssReconocidas: 1094,
      semanasARecuperar: 200,
      tieneIssste: 'no',
      requiereContadora: 'no',
    });
    expect(datos!.fechaIngreso).toEqual(utc(2025, 1, 17));
    expect(datos!.fechaNacimiento).toEqual(utc(1970, 9, 9));
  });

  it('CP-254 acumula_todos_los_rechazos: CURP, asesor y fecha de nacimiento inválidos traen los tres motivos', async () => {
    const r = await validar({
      CURP: 'GASC730208MPLJVFT',
      Asesor: 'Lic. Pedro Gómez',
      'Fecha de nacimiento': '31/02/1968',
    });
    expect(r.datos).toBeNull();
    expect(r.rechazos.length).toBeGreaterThanOrEqual(3);
    expect(r.rechazos.join(' | ')).toMatch(/CURP/);
    expect(r.rechazos.join(' | ')).toMatch(/Asesor/);
    expect(r.rechazos.join(' | ')).toMatch(/Fecha de nacimiento/);
  });

  it('CP-254 cada rechazo dice de qué columna viene', async () => {
    const r = await validar({ AFORE: 'No existe', 'Estado civil': null });
    expect(r.datos).toBeNull();
    expect(r.rechazos.some((m) => m.startsWith('AFORE'))).toBe(true);
    expect(r.rechazos.some((m) => m.startsWith('Estado civil'))).toBe(true);
  });

  it('CP-255 no_carga_edad_ni_dias: datos tiene exactamente los campos de DatosCliente', async () => {
    const { datos } = await validar();
    expect(Object.keys(datos!).sort()).toEqual(
      [
        'nombre',
        'apellidoPaterno',
        'apellidoMaterno',
        'referidoPor',
        'telefono',
        'correoElectronico',
        'observacionesGenerales',
        'asesorId',
        'fechaIngreso',
        'fechaNacimiento',
        'curp',
        'rfc',
        'nss',
        'sexo',
        'estadoCivil',
        'dependientesEconomicos',
        'regimen',
        'leyProbable',
        'afore',
        'semanasImssReconocidas',
        'semanasARecuperar',
        'tieneIssste',
        'requiereContadora',
        'domicilio',
        'estado',
        'subdelegacionImssProbable',
        'cambioAfore',
        'objetivoCliente',
        'etapas',
      ].sort(),
    );
    const json = JSON.stringify(datos).toLowerCase();
    for (const campo of ['edad', 'dias', 'compromisototal', '"id"'])
      expect(json).not.toContain(campo);
  });

  it('CP-256 avance_y_estatus_por_etapa: las 16 etapas quedan con estatus, avance, acción y fecha', async () => {
    const { datos } = await validar();
    const etapas = datos!.etapas;
    expect(etapas).toHaveLength(16);
    expect(etapas.map((e) => e.numeroPaso)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    expect(etapas[0]).toEqual({
      numeroPaso: 0,
      estatus: 'Finalizado',
      avance: 100,
      accion: null, // la etapa 0 no tiene columna de acción
      fechaCompromiso: utc(2025, 2, 1),
      motivoRechazo: null,
    });
    expect(etapas[1]).toEqual({
      numeroPaso: 1,
      estatus: 'En proceso asesor',
      avance: 40,
      accion: 'Elaborar diagnóstico especializado', // sin espacios de más
      fechaCompromiso: utc(2025, 4, 2),
      motivoRechazo: null,
    });
    expect(etapas[2]).toMatchObject({
      estatus: 'No aplica',
      avance: null,
      accion: null,
      fechaCompromiso: null,
    });
    expect(etapas[15]).toMatchObject({ estatus: 'Por iniciar', avance: 10 });
  });

  it('CP-256 una etapa Bloqueado guarda el motivo fijo y avisa; Detenido conserva el avance', async () => {
    const r = await validar({
      [estatusDe(5)]: 'Bloqueado',
      Avance5: 0.3,
      [estatusDe(6)]: 'Detenido',
      Avance6: 0.2,
    });
    expect(r.datos!.etapas[5]).toMatchObject({
      estatus: 'Bloqueado',
      avance: 30,
      motivoRechazo: 'Importado desde Excel, sin motivo registrado',
    });
    expect(r.datos!.etapas[6]).toMatchObject({
      estatus: 'Detenido',
      avance: 20,
      motivoRechazo: null,
    });
    expect(
      r.advertencias.some((m) => m.includes('Etapa 5') && m.includes('bloqueado_sin_motivo')),
    ).toBe(true);
  });

  it('CP-256 un estatus desconocido rechaza el renglón y dice de qué etapa', async () => {
    const r = await validar({ [estatusDe(3)]: 'En trámite' });
    expect(r.datos).toBeNull();
    expect(r.rechazos.some((m) => m.includes('Etapa 3'))).toBe(true);
  });

  it('CP-256 una fecha compromiso inválida de una etapa se carga vacía con advertencia, sin rechazo', async () => {
    const r = await validar({ 'Fecha compromiso1': 'pronto' });
    expect(r.rechazos).toEqual([]);
    expect(r.datos!.etapas[1].fechaCompromiso).toBeNull();
    expect(r.advertencias.some((m) => m.includes('Etapa 1'))).toBe(true);
  });

  it('CP-256 un avance fuera de rango en una etapa avisa con el número de etapa', async () => {
    const r = await validar({ Avance1: 0.1 });
    expect(r.datos!.etapas[1].avance).toBe(20);
    expect(
      r.advertencias.some((m) => m.includes('Etapa 1') && m.includes('avance_fuera_de_rango')),
    ).toBe(true);
  });

  it('CP-313 campos_pendientes_de_captura: domicilio, estado y subdelegación pendientes, cambio de AFORE por confirmar', async () => {
    const r = await validar();
    expect(r.datos).toMatchObject({
      domicilio: 'Pendiente de captura',
      estado: 'Pendiente de captura',
      subdelegacionImssProbable: 'Pendiente de captura',
      cambioAfore: 'por_confirmar',
    });
    expect(r.advertencias.filter((m) => m.includes('campos_pendientes_de_captura'))).toHaveLength(
      1,
    );
  });

  it('CP-314 objetivo_asumido: pensionarse_asap con la advertencia', async () => {
    const r = await validar();
    expect(r.datos!.objetivoCliente).toBe('pensionarse_asap');
    expect(r.advertencias.filter((m) => m.includes('objetivo_asumido'))).toHaveLength(1);
  });

  it('CP-313 los renglones rechazados no llevan datos ni las marcas estructurales', async () => {
    const r = await validar({ CURP: '' });
    expect(r.datos).toBeNull();
    expect(r.advertencias.join(' ')).not.toContain('campos_pendientes_de_captura');
  });

  it('CP-305 el nombre se divide en nombre y apellidos, el sexo sale de la CURP y se anotan los ajustes', async () => {
    const r = await validar({
      'Nombre del cliente': 'RUBÉN JIMÉNEZ EUÁN',
      CURP: CURP_B, // carácter 11 = H
      'Fecha de nacimiento': utc(1961, 6, 9),
    });
    expect(r.datos).toMatchObject({
      nombre: 'Rubén',
      apellidoPaterno: 'Jiménez',
      apellidoMaterno: 'Euán',
      sexo: 'hombre',
    });
    expect(r.ajustes.join(' ')).toContain('nombre_propio');
    expect(r.ajustes.join(' ')).toContain('nombre_dividido');
  });

  it('CP-308 un nombre de dos palabras queda con apellido materno vacío', async () => {
    const r = await validar({ 'Nombre del cliente': 'Rosa Pérez' });
    expect(r.datos).toMatchObject({
      nombre: 'Rosa',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: '',
    });
    expect(r.rechazos).toEqual([]);
  });

  it('CP-209 un nombre de una sola palabra rechaza (faltan los apellidos)', async () => {
    const r = await validar({ 'Nombre del cliente': 'Madonna' });
    expect(r.datos).toBeNull();
    expect(r.rechazos.some((m) => m.startsWith('Nombre del cliente') && /apellido/i.test(m))).toBe(
      true,
    );
  });

  it('CP-209 un nombre vacío rechaza', async () => {
    const r = await validar({ 'Nombre del cliente': null });
    expect(r.datos).toBeNull();
    expect(r.rechazos.some((m) => m.startsWith('Nombre del cliente'))).toBe(true);
  });

  it('CP-212 teléfono y correo inválidos se cargan vacíos con advertencia; válidos con formato raro se ajustan', async () => {
    const malo = await validar({ Teléfono: '12345', Email: 'sin-arroba' });
    expect(malo.rechazos).toEqual([]);
    expect(malo.datos).toMatchObject({ telefono: '', correoElectronico: '' });
    expect(malo.advertencias.some((m) => m.startsWith('Teléfono'))).toBe(true);
    expect(malo.advertencias.some((m) => m.startsWith('Email'))).toBe(true);

    const raro = await validar({ Teléfono: '(987) 662-8360', Email: ' LETICIA.MAY@EJEMPLO.TEST ' });
    expect(raro.datos).toMatchObject({
      telefono: '9876628360',
      correoElectronico: 'leticia.may@ejemplo.test',
    });
    expect(raro.ajustes.some((m) => m.startsWith('Teléfono'))).toBe(true);
    expect(raro.ajustes.some((m) => m.startsWith('Email'))).toBe(true);
  });

  it('CP-253 referidor vacío da texto vacío con advertencia; observaciones vacías, texto vacío sin advertencia', async () => {
    const r = await validar({ Referidor: null, 'Observaciones generales': '  ' });
    expect(r.datos).toMatchObject({ referidoPor: '', observacionesGenerales: '' });
    expect(r.advertencias.some((m) => m.startsWith('Referidor'))).toBe(true);
    expect(r.advertencias.some((m) => m.startsWith('Observaciones'))).toBe(false);
    const con = await validar({ 'Observaciones generales': '  Pago en parcialidades ' });
    expect(con.datos!.observacionesGenerales).toBe('Pago en parcialidades');
  });

  it('CP-253 ISSSTE y contadora: Sí, No y Por confirmar; vacío o desconocido da por_confirmar con advertencia', async () => {
    const si = await validar({ '¿Tiene ISSSTE?': 'Sí', 'Requiere contadora': 'Por confirmar' });
    expect(si.datos).toMatchObject({ tieneIssste: 'si', requiereContadora: 'por_confirmar' });
    expect(si.advertencias.some((m) => m.startsWith('¿Tiene ISSSTE?'))).toBe(false);
    for (const malo of [null, 'Quizás']) {
      const r = await validar({ '¿Tiene ISSSTE?': malo, 'Requiere contadora': malo });
      expect(r.rechazos).toEqual([]);
      expect(r.datos).toMatchObject({
        tieneIssste: 'por_confirmar',
        requiereContadora: 'por_confirmar',
      });
      expect(r.advertencias.some((m) => m.startsWith('¿Tiene ISSSTE?'))).toBe(true);
      expect(r.advertencias.some((m) => m.startsWith('Requiere contadora'))).toBe(true);
    }
  });

  it('CP-253 dependientes económicos: entero de 0 en adelante; vacío, texto, negativo o con decimales rechazan', async () => {
    expect((await validar({ 'Dependientes económicos': 0 })).datos!.dependientesEconomicos).toBe(0);
    for (const malo of [null, 'varios', -1, 2.5]) {
      const r = await validar({ 'Dependientes económicos': malo });
      expect(r.datos).toBeNull();
      expect(r.rechazos.some((m) => m.startsWith('Dependientes económicos'))).toBe(true);
    }
  });

  it('CP-310 semanas: reconocidas vacías dan 0 con advertencia, negativas rechazan y "N/D" en recuperar da 0 con advertencia', async () => {
    const vacia = await validar({ 'Semanas IMSS reconocidas': null });
    expect(vacia.datos!.semanasImssReconocidas).toBe(0);
    expect(vacia.advertencias.some((m) => m.startsWith('Semanas IMSS reconocidas'))).toBe(true);

    const negativa = await validar({ 'Semanas IMSS reconocidas': -35 });
    expect(negativa.datos).toBeNull();
    expect(negativa.rechazos.some((m) => m.startsWith('Semanas IMSS reconocidas'))).toBe(true);

    const nd = await validar({ 'Semanas a recuperar': 'N/D' });
    expect(nd.datos!.semanasARecuperar).toBe(0);
    expect(nd.advertencias.some((m) => m.startsWith('Semanas a recuperar'))).toBe(true);

    const sinDato = await validar({ 'Semanas a recuperar': null });
    expect(sinDato.datos!.semanasARecuperar).toBeNull();
    expect(sinDato.advertencias.some((m) => m.startsWith('Semanas a recuperar'))).toBe(false);
  });

  it('CP-231 NSS: vacío con ISSSTE no advierte, vacío con IMSS advierte, de 9 dígitos rechaza', async () => {
    const issste = await validar({ 'Régimen seguridad social': 'ISSSTE', NSS: null });
    expect(issste.datos!.nss).toBeNull();
    expect(issste.advertencias.some((m) => m.startsWith('NSS'))).toBe(false);
    const imss = await validar({ NSS: null });
    expect(imss.datos!.nss).toBeNull();
    expect(imss.advertencias.some((m) => m.startsWith('NSS'))).toBe(true);
    const corto = await validar({ NSS: '991041726' });
    expect(corto.datos).toBeNull();
    expect(corto.rechazos.some((m) => m.startsWith('NSS'))).toBe(true);
  });

  it('CP-227 una CURP que no coincide con el nacimiento carga con advertencia; el RFC inválido se carga vacío', async () => {
    const r = await validar({ 'Fecha de nacimiento': utc(1971, 9, 9), RFC: 'corto' });
    expect(r.rechazos).toEqual([]);
    expect(r.datos!.rfc).toBeNull();
    expect(r.advertencias.some((m) => m.startsWith('CURP'))).toBe(true);
    expect(r.advertencias.some((m) => m.startsWith('RFC'))).toBe(true);
  });

  it('CP-237 régimen y ley desconocidos pasan a "No determinado" con advertencia', async () => {
    const r = await validar({ 'Régimen seguridad social': 'Otro', 'Ley probable': 'Ley 71' });
    expect(r.datos).toMatchObject({ regimen: 'No determinado', leyProbable: 'No determinado' });
    expect(r.advertencias.some((m) => m.startsWith('Ley probable'))).toBe(true);
    expect(r.advertencias.some((m) => m.startsWith('Régimen seguridad social'))).toBe(true);
  });

  it('CP-253 el estado civil de la hoja Catálogo ("Casado (a)") no cuenta como ajuste', async () => {
    const r = await validar({ 'Estado civil': 'Soltero (a)' });
    expect(r.datos!.estadoCivil).toBe('soltero');
    expect(r.ajustes.some((m) => m.startsWith('Estado civil'))).toBe(false);
  });

  it('CP-214 ningún mensaje contiene la CURP ni el NSS completos', async () => {
    for (const cambios of [
      { 'Fecha de nacimiento': utc(1971, 9, 9) },
      { CURP: 'hduw700909mnltwl04 x' },
      { NSS: '991041726', CURP: ' houw 700909 mnltwl04 ' },
      { NSS: '99-03-30-4284-5' },
    ]) {
      const r = await validar(cambios);
      const todo = texto(r);
      for (const dato of [CURP_A, NSS_A, '991041726', '99-03-30-4284-5']) {
        expect(todo.toUpperCase()).not.toContain(dato.toUpperCase());
      }
    }
  });

  it('CP-254 el idExcel es null si la celda ID no es un número', async () => {
    expect((await validar({ ID: null })).idExcel).toBeNull();
    expect((await validar({ ID: 'x' })).idExcel).toBeNull();
    expect((await validar({ ID: 12 })).idExcel).toBe(12);
  });
});

// Renglones ya validados para probar los duplicados.
async function ya(fila: number, cambios: Record<string, unknown>): Promise<RenglonValidado> {
  return validar({ ID: fila, ...cambios }, fila);
}
const vacios = () => ({ curps: new Set<string>(), nss: new Set<string>() });

describe('marcarDuplicados', () => {
  it('CP-257 duplicado_curp_en_archivo: el segundo se rechaza con la fila del primero', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, {
      CURP: CURP_A,
      NSS: NSS_B,
      'Nombre del cliente': 'Otra Persona Distinta',
    });
    const [ra, rb] = marcarDuplicados([a, b], vacios());
    expect(ra.rechazos).toEqual([]);
    expect(ra.datos).not.toBeNull();
    expect(rb.datos).toBeNull();
    expect(rb.rechazos).toHaveLength(1);
    expect(rb.rechazos[0]).toMatch(/CURP/);
    expect(rb.rechazos[0]).toContain('fila 6');
    expect(rb.rechazos[0]).not.toContain(CURP_A);
  });

  it('CP-258 duplicado_nss_en_archivo: el segundo se rechaza con la fila del primero', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, {
      CURP: CURP_B,
      NSS: NSS_A,
      'Nombre del cliente': 'Otra Persona Distinta',
    });
    const [, rb] = marcarDuplicados([a, b], vacios());
    expect(rb.datos).toBeNull();
    expect(rb.rechazos).toHaveLength(1);
    expect(rb.rechazos[0]).toMatch(/NSS/);
    expect(rb.rechazos[0]).toContain('fila 6');
    expect(rb.rechazos[0]).not.toContain(NSS_A);
  });

  it('CP-259 ya_existe_en_base: CURP o NSS existentes se rechazan con "ya existe"', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, {
      CURP: CURP_B,
      NSS: NSS_B,
      'Nombre del cliente': 'Otra Persona Distinta',
    });
    const [ra, rb] = marcarDuplicados([a, b], { curps: new Set([CURP_A]), nss: new Set([NSS_B]) });
    expect(ra.datos).toBeNull();
    expect(ra.rechazos.join(' ')).toMatch(/CURP ya existe/i);
    expect(rb.datos).toBeNull();
    expect(rb.rechazos.join(' ')).toMatch(/NSS ya existe/i);
    expect(JSON.stringify([ra, rb].map((r) => r.rechazos))).not.toContain(CURP_A);
  });

  it('CP-260 posible_duplicado_advierte: mismo nombre y nacimiento con otro CURP se carga con advertencia', async () => {
    const a = await ya(6, {
      CURP: CURP_A,
      NSS: NSS_A,
      'Nombre del cliente': 'Sergio Ruiz Vázquez',
    });
    const b = await ya(7, {
      CURP: CURP_B,
      NSS: NSS_B,
      'Nombre del cliente': 'SERGIO RUIZ VAZQUEZ',
      'Fecha de nacimiento': utc(1970, 9, 9),
    });
    const [ra, rb] = marcarDuplicados([a, b], vacios());
    expect(ra.advertencias.some((m) => m.includes('posible_duplicado'))).toBe(false);
    expect(rb.rechazos).toEqual([]);
    expect(rb.datos).not.toBeNull();
    const aviso = rb.advertencias.find((m) => m.includes('posible_duplicado'));
    expect(aviso).toBeDefined();
    expect(aviso).toContain('fila 6');
  });

  it('CP-260 el mismo nombre con otra fecha de nacimiento no es posible duplicado', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, { CURP: CURP_B, NSS: NSS_B, 'Fecha de nacimiento': utc(1961, 6, 9) });
    const [, rb] = marcarDuplicados([a, b], vacios());
    expect(rb.advertencias.some((m) => m.includes('posible_duplicado'))).toBe(false);
  });

  it('CP-261 gana_el_primero: con tres renglones iguales, el segundo y el tercero apuntan al primero', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, { CURP: CURP_A, NSS: NSS_B });
    const c = await ya(8, { CURP: CURP_A, NSS: NSS_C });
    const [ra, rb, rc] = marcarDuplicados([a, b, c], vacios());
    expect(ra.datos).not.toBeNull();
    expect(rb.rechazos[0]).toContain('fila 6');
    expect(rc.rechazos[0]).toContain('fila 6');
  });

  it('CP-261 se respeta el orden del arreglo, no el número de fila', async () => {
    const a = await ya(9, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, { CURP: CURP_A, NSS: NSS_B });
    const [ra, rb] = marcarDuplicados([a, b], vacios());
    expect(ra.datos).not.toBeNull();
    expect(rb.rechazos[0]).toContain('fila 9');
  });

  it('CP-262 rechazado_no_cuenta_para_duplicados: un renglón rechazado no bloquea a uno posterior', async () => {
    const malo = await ya(6, { CURP: CURP_A, Asesor: 'Lic. Pedro Gómez' });
    const bueno = await ya(7, { CURP: CURP_A, NSS: NSS_A });
    const [rm, rb] = marcarDuplicados([malo, bueno], vacios());
    expect(rm.datos).toBeNull();
    expect(rb.datos).not.toBeNull();
    expect(rb.rechazos).toEqual([]);
  });

  it('CP-262 un renglón rechazado por duplicado tampoco registra su otro dato', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, { CURP: CURP_B, NSS: NSS_A }); // rechazado por NSS repetido
    const c = await ya(8, { CURP: CURP_B, NSS: NSS_C }); // su CURP no quedó registrado
    const [, rb, rc] = marcarDuplicados([a, b, c], vacios());
    expect(rb.datos).toBeNull();
    expect(rc.datos).not.toBeNull();
    expect(rc.rechazos).toEqual([]);
  });

  it('CP-263 sin_nss_no_se_compara: dos NSS vacíos no son duplicados', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: null, 'Régimen seguridad social': 'ISSSTE' });
    const b = await ya(7, { CURP: CURP_B, NSS: null, 'Régimen seguridad social': 'ISSSTE' });
    const [ra, rb] = marcarDuplicados([a, b], { curps: new Set(), nss: new Set(['']) });
    expect(ra.datos).not.toBeNull();
    expect(rb.datos).not.toBeNull();
  });

  it('CP-257 no modifica los renglones recibidos', async () => {
    const a = await ya(6, { CURP: CURP_A, NSS: NSS_A });
    const b = await ya(7, { CURP: CURP_A, NSS: NSS_B });
    const antes = JSON.stringify([a, b]);
    const [, rb] = marcarDuplicados([a, b], vacios());
    expect(JSON.stringify([a, b])).toBe(antes);
    expect(rb).not.toBe(b);
  });

  it('CP-257 los renglones ya rechazados pasan tal cual y no se les agregan motivos de duplicado', async () => {
    const malo = await ya(6, { CURP: CURP_A, Asesor: 'Lic. Pedro Gómez' });
    const [r] = marcarDuplicados([malo], { curps: new Set([CURP_A]), nss: new Set() });
    expect(r.rechazos).toEqual(malo.rechazos);
  });
});

describe('fixture completo', () => {
  it('CP-264 fixture_completo: los rechazos son exactamente los IDs 44, 45, 46, 47, 48, 49, 50, 52, 53 y 54', async () => {
    const { renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    const contexto = ctx();
    const validados: RenglonValidado[] = [];
    for (const crudo of renglones) validados.push(await validarRenglon(crudo, contexto));
    const finales = marcarDuplicados(validados, vacios());

    const rechazados = finales.filter((r) => r.rechazos.length > 0).map((r) => r.idExcel);
    expect(rechazados).toEqual([44, 45, 46, 47, 48, 49, 50, 52, 53, 54]);
    expect(finales.filter((r) => r.datos !== null)).toHaveLength(44);
    expect(finales.every((r) => (r.datos === null) === r.rechazos.length > 0)).toBe(true);

    // Los dos duplicados dicen de qué fila del archivo vienen.
    const por = (id: number) => finales.find((r) => r.idExcel === id)!;
    expect(por(53).rechazos.join(' ')).toMatch(/CURP/);
    expect(por(53).rechazos.join(' ')).toContain('fila 17'); // ID 12 está en la fila 17
    expect(por(54).rechazos.join(' ')).toMatch(/NSS/);
    expect(por(54).rechazos.join(' ')).toContain('fila 25'); // ID 20 está en la fila 25

    // Advertencias específicas: IDs 33 (posible duplicado), 34 (semanas N/D), 40 (Ley 71) y 42 (avance 55).
    const avisa = (id: number, codigo: string) =>
      por(id).advertencias.some((m) => m.includes(codigo));
    expect(avisa(33, 'posible_duplicado')).toBe(true);
    expect(avisa(34, 'semanas_no_numericas')).toBe(true);
    expect(avisa(40, 'regimen_o_ley') || avisa(40, 'ley_desconocido')).toBe(true);
    expect(avisa(42, 'avance_no_multiplo_de_10')).toBe(true);
    // Solo el ID 33 es posible duplicado.
    expect(
      finales
        .filter((r) => r.advertencias.some((m) => m.includes('posible_duplicado')))
        .map((r) => r.idExcel),
    ).toEqual([33]);

    // Los 44 cargados llevan las dos marcas estructurales.
    for (const r of finales.filter((x) => x.datos !== null)) {
      expect(r.advertencias.some((m) => m.includes('campos_pendientes_de_captura'))).toBe(true);
      expect(r.advertencias.some((m) => m.includes('objetivo_asumido'))).toBe(true);
    }
  });
});
