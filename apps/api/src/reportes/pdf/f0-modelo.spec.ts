import { calcularEdad, construirModeloF0, DatosF0 } from './f0-modelo';

// El modelo del F0 es una función pura: convierte los datos del cliente en lo que se imprime en el formato
// oficial (casillas marcadas, régimen, edad, filas de correcciones...). Se prueba sin generar el PDF.
const OBJETIVOS = [
  'Corrección de datos personales',
  'Unificación de NSS',
  'Aclaración/Recuperación de Semanas',
  'Modalidad 10',
  'Modalidad 40',
  'Modalidad 40 retroactiva',
  'IMSS-ISSSTE/Portabilidad',
  'Unificación AFORE/cuentas',
  'SAR92/Recursos',
  'Solicitud de pensión',
  'Negativa de pensión/recuperación de recursos',
  'Juicio y jurisdicción',
].map((nombre, i) => ({ id: i + 1, nombre }));

function datos(extra: Partial<DatosF0> = {}): DatosF0 {
  return {
    hoy: '2026-11-06',
    cliente: {
      nombre: 'José Ángel',
      apellido_paterno: 'Pérez',
      apellido_materno: 'Núñez',
      referido_por: 'Un amigo',
      telefono: '9990000000',
      fecha_ingreso: '2026-11-01',
      correo_electronico: 'cliente@ejemplo.invalid',
      curp: 'PEPJ700517HQRRRN09',
      rfc: 'PEPJ700517AB1',
      nss: '12345678901',
      ine: null,
      fecha_nacimiento: '1970-05-17',
      sexo: 'hombre',
      estado_civil: 'casado',
      ocupacion: 'Docente',
      domicilio: 'Calle Ficticia 1',
      estado: 'Quintana Roo',
      subdelegacion_imss_probable: 'Subdelegación ficticia',
      cambio_afore: 'no',
      objetivo_cliente: 'mejorar_monto_pension',
      semanas_imss_reconocidas: 640,
      observaciones_generales: 'Observación ficticia.',
    },
    leyProbable: 'Ley 73',
    afore: 'Azteca',
    asesor: 'Ana Ficticia',
    historial: {
      semanas_issste: 120,
      salario_promedio: 15234.5,
      ultimo_patron: 'Patrón S.A.',
      vigencia_derechos: 'si',
    },
    catalogoObjetivos: OBJETIVOS,
    objetivosMarcados: [1, 12],
    documentos: [],
    correcciones: [],
    ...extra,
  };
}

describe('calcularEdad', () => {
  it('cuenta años cumplidos a la fecha dada', () => {
    expect(calcularEdad('1970-05-17', '2026-11-06')).toBe(56);
    expect(calcularEdad('1970-11-06', '2026-11-06')).toBe(56); // cumple hoy
    expect(calcularEdad('1970-11-07', '2026-11-06')).toBe(55); // cumple mañana
    expect(calcularEdad('2000-02-29', '2026-02-28')).toBe(25);
  });
});

describe('construirModeloF0: datos generales (sección 1)', () => {
  it('arma nombre completo, edad y fechas en formato DD/MM/AAAA', () => {
    const { datosGenerales: g, fecha } = construirModeloF0(datos());
    expect(g.nombreCompleto).toBe('José Ángel Pérez Núñez');
    expect(g.edad).toBe('56');
    expect(g.fechaNacimiento).toBe('17/05/1970');
    expect(fecha).toBe('01/11/2026');
    expect(g.sexo).toBe('Hombre');
    expect(g.estadoCivil).toBe('Casado');
    expect(g.cambioAfore).toBe('No');
    expect(g.asesor).toBe('Ana Ficticia');
    expect(g.referidoPor).toBe('Un amigo');
  });

  it('los datos que faltan quedan en blanco, sin "null" ni "undefined"', () => {
    const base = datos();
    const { datosGenerales: g } = construirModeloF0(
      datos({
        cliente: { ...base.cliente, curp: null, rfc: null, nss: null, ine: null, ocupacion: null },
      }),
    );
    expect([g.curp, g.rfc, g.nss, g.ine, g.ocupacion]).toEqual(['', '', '', '', '']);
  });

  it('Ley 73 o 97 va en Régimen IMSS; Décimo Transitorio o Cuenta Individual, en Régimen ISSSTE (abreviado como en el formato)', () => {
    const imss = construirModeloF0(datos({ leyProbable: 'Ley 97' })).datosGenerales;
    expect([imss.regimenImss, imss.regimenIssste]).toEqual(['Ley 97', '']);
    const issste = construirModeloF0(datos({ leyProbable: 'Décimo Transitorio ISSSTE' }));
    const cuenta = construirModeloF0(datos({ leyProbable: 'Cuenta Individual ISSSTE' }));
    expect(cuenta.datosGenerales.regimenIssste).toBe('Cuenta Ind.');
    expect([issste.datosGenerales.regimenImss, issste.datosGenerales.regimenIssste]).toEqual([
      '',
      'Décimo Trans.',
    ]);
  });

  it('"Mixto/revisar" y "No determinado" se muestran en ambos regímenes', () => {
    for (const ley of ['Mixto/revisar', 'No determinado']) {
      const g = construirModeloF0(datos({ leyProbable: ley })).datosGenerales;
      expect([g.regimenImss, g.regimenIssste]).toEqual([ley, ley]);
    }
  });
});

describe('construirModeloF0: documentación inicial (sección 2)', () => {
  it('marca los documentos subidos que no están en estatus "no" y copia el número de la constancia', () => {
    const { documentos } = construirModeloF0(
      datos({
        documentos: [
          { tipo: 'Acta de Nacimiento', estatus: 'si', numero_referencia: null },
          { tipo: 'CURP', estatus: 'por_confirmar', numero_referencia: null },
          { tipo: 'INE', estatus: 'no', numero_referencia: null },
          {
            tipo: 'Constancia de Semanas Cotizadas (IMSS)',
            estatus: 'si',
            numero_referencia: 'F-123',
          },
          { tipo: 'Estado de Cuenta AFORE', estatus: 'si', numero_referencia: null },
        ],
      }),
    );
    expect(documentos).toEqual({
      acta: true,
      curp: true,
      ine: false,
      rfc: false,
      comprobanteDomicilio: false,
      constanciaSemanas: true,
      numeroConstancia: 'F-123',
    });
  });

  it('sin documentos ninguna casilla queda marcada', () => {
    const { documentos } = construirModeloF0(datos());
    expect(Object.values(documentos).filter((v) => v === true)).toHaveLength(0);
    expect(documentos.numeroConstancia).toBe('');
  });
});

describe('construirModeloF0: diagnóstico inicial (sección 3)', () => {
  it('conserva el objetivo del cliente y numera los 12 objetivos del 2 al 13 con los marcados', () => {
    const m = construirModeloF0(datos());
    expect(m.objetivoCliente).toBe('mejorar_monto_pension');
    expect(m.objetivos).toHaveLength(12);
    expect(m.objetivos[0]).toEqual({
      numero: 2,
      nombre: 'Corrección de datos personales',
      marcado: true,
    });
    expect(m.objetivos[11]).toEqual({ numero: 13, nombre: 'Juicio y jurisdicción', marcado: true });
    expect(m.objetivos.filter((o) => o.marcado).map((o) => o.numero)).toEqual([2, 13]);
  });
});

describe('construirModeloF0: correcciones y validaciones (sección 4)', () => {
  it('siempre trae las 6 filas del formato; cada trámite va en su fila', () => {
    const vacio = construirModeloF0(datos()).correcciones;
    expect(vacio.map((f) => f.tramite)).toEqual([
      'Corrección CURP',
      'Corrección Acta',
      'Unificación NSS',
      'Corrección AFORE',
      'Actualización IMSS',
      'Otro:',
    ]);
    const { correcciones } = construirModeloF0(
      datos({
        correcciones: [
          {
            tipo: 'Corrección de CURP',
            observaciones: 'Falta homoclave',
            tiempo_promedio: '15 días',
          },
          {
            tipo: 'Unificación de NSS (Duplicidad / Multiplicidad)',
            observaciones: null,
            tiempo_promedio: '2 meses',
          },
          { tipo: 'Corrección de CURP', observaciones: 'Segunda gestión', tiempo_promedio: null },
        ],
      }),
    );
    expect(correcciones[0]).toEqual({
      tramite: 'Corrección CURP',
      observaciones: 'Falta homoclave; Segunda gestión',
      tiempo: '15 días',
    });
    expect(correcciones[2]).toEqual({
      tramite: 'Unificación NSS',
      observaciones: '',
      tiempo: '2 meses',
    });
    expect(correcciones[1].observaciones).toBe('');
  });

  it('los trámites sin fila propia (RFC, nombre, domicilio, Otro...) van en la fila "Otro:"', () => {
    const { correcciones } = construirModeloF0(
      datos({
        correcciones: [
          { tipo: 'Corrección de RFC', observaciones: 'Rectificar', tiempo_promedio: '10 días' },
          { tipo: 'Otro', observaciones: 'Trámite especial', tiempo_promedio: null },
        ],
      }),
    );
    const otro = correcciones[5];
    expect(otro.tramite).toBe('Otro: Corrección de RFC');
    expect(otro.observaciones).toBe('Corrección de RFC: Rectificar; Trámite especial');
    expect(otro.tiempo).toBe('10 días');
  });
});

describe('construirModeloF0: historial laboral (sección 5) y observaciones (sección 6)', () => {
  it('formatea semanas, salario y vigencia', () => {
    const { historial, observaciones } = construirModeloF0(datos());
    expect(historial).toEqual({
      semanasImss: '640',
      semanasIssste: '120',
      salarioPromedio: '$15,234.50',
      ultimoPatron: 'Patrón S.A.',
      vigenciaDerechos: 'Sí',
    });
    expect(observaciones).toBe('Observación ficticia.');
  });

  it('sin historial laboral queda en blanco salvo las semanas del IMSS', () => {
    const { historial } = construirModeloF0(datos({ historial: null }));
    expect(historial).toEqual({
      semanasImss: '640',
      semanasIssste: '',
      salarioPromedio: '',
      ultimoPatron: '',
      vigenciaDerechos: '',
    });
  });
});
