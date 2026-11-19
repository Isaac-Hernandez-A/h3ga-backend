import { dividirNombre, sanearCorreo, sanearNombre, sanearTelefono } from './saneadores/texto';

// Saneadores de nombre, correo y teléfono (Actividad 5, Tarea 3). Todos los datos son ficticios.
describe('sanearNombre', () => {
  it('CP-205 nombre_mayusculas: pasa a nombre propio y lo anota', () => {
    const r = sanearNombre('RUBÉN JIMÉNEZ EUÁN');
    expect(r.valor).toBe('Rubén Jiménez Euán');
    expect(r.ajustes).toContain('nombre_propio');
    expect(r.rechazo).toBeNull();
  });

  it('CP-206 nombre_minusculas_y_espacios: quita espacios de más y pasa a nombre propio', () => {
    const r = sanearNombre('  esteban  torres aguilar ');
    expect(r.valor).toBe('Esteban Torres Aguilar');
    expect(r.ajustes).toContain('nombre_propio');
  });

  it('CP-207 nombre_mixto_solo_espacios: no cambia las mayúsculas de un nombre mixto', () => {
    const r = sanearNombre('María de la Luz  Pérez');
    expect(r.valor).toBe('María de la Luz Pérez');
    expect(r.ajustes).not.toContain('nombre_propio');
    expect(r.ajustes).toContain('espacios');
  });

  it('CP-207 las partículas quedan en minúsculas al pasar a nombre propio, salvo al inicio', () => {
    expect(sanearNombre('JUAN CARLOS DE LA CRUZ Y MENDOZA').valor).toBe(
      'Juan Carlos de la Cruz y Mendoza',
    );
    expect(sanearNombre('DEL VALLE RAMÍREZ').valor).toBe('Del Valle Ramírez');
  });

  it('CP-207 no inventa acentos: "jose" se queda sin acento', () => {
    expect(sanearNombre('JOSE MARTINEZ').valor).toBe('Jose Martinez');
  });

  it('CP-208 nombre_unicode_y_invisibles: sale en NFC y sin caracteres invisibles', () => {
    const nfd = 'Rubén Jiménez​ Euán';
    expect(nfd).not.toBe(nfd.normalize('NFC'));
    const r = sanearNombre(nfd);
    expect(r.valor).toBe('Rubén Jiménez Euán');
    expect(r.valor).toBe(r.valor!.normalize('NFC'));
    expect(r.valor).not.toMatch(new RegExp('\u00A0|\u200B|\u200C|\u200D|\uFEFF|\u2060'));
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.rechazo).toBeNull();
  });

  it('CP-209 nombre_vacio_rechaza: null, texto en blanco o solo invisibles dan rechazo', () => {
    for (const vacio of [null, undefined, '   ', '​ ']) {
      const r = sanearNombre(vacio);
      expect(r.valor).toBeNull();
      expect(r.rechazo).not.toBeNull();
    }
  });
});

describe('sanearCorreo', () => {
  it('CP-210 correo_mayusculas: quita espacios y pasa a minúsculas', () => {
    const r = sanearCorreo(' MANUEL.DIAZ.90@EJEMPLO.TEST ');
    expect(r.valor).toBe('manuel.diaz.90@ejemplo.test');
    expect(r.ajustes.length).toBeGreaterThan(0);
    expect(r.advertencias).toEqual([]);
  });

  it('CP-211 correo_invalido_advierte: sin arroba da null y una advertencia', () => {
    const r = sanearCorreo('sin-arroba');
    expect(r.valor).toBeNull();
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-211 un correo vacío da null sin advertencia', () => {
    for (const vacio of [null, '', '  ']) {
      const r = sanearCorreo(vacio);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toEqual([]);
    }
  });
});

describe('sanearTelefono', () => {
  it('CP-212 telefono_formatos: deja 10 dígitos en todos los formatos', () => {
    expect(sanearTelefono('(987) 662-8360').valor).toBe('9876628360');
    expect(sanearTelefono('+52 998 607 9113').valor).toBe('9986079113');
    expect(sanearTelefono('998 829 0920').valor).toBe('9988290920');
    expect(sanearTelefono(9841994569).valor).toBe('9841994569');
    expect(sanearTelefono('(987) 662-8360').ajustes.length).toBeGreaterThan(0);
  });

  it('CP-212 un número de 10 dígitos que ya viene limpio no lleva ajustes', () => {
    const r = sanearTelefono('9876628360');
    expect(r.valor).toBe('9876628360');
    expect(r.ajustes).toEqual([]);
  });

  it('CP-213 telefono_invalido_advierte: "12345" da null y advertencia', () => {
    const r = sanearTelefono('12345');
    expect(r.valor).toBeNull();
    expect(r.advertencias).toHaveLength(1);
    expect(r.rechazo).toBeNull();
  });

  it('CP-213 un teléfono vacío da null sin advertencia', () => {
    for (const vacio of [null, '', '  ']) {
      const r = sanearTelefono(vacio);
      expect(r.valor).toBeNull();
      expect(r.advertencias).toEqual([]);
    }
  });
});

describe('sin PII en los mensajes', () => {
  it('CP-214 sin_pii_en_mensajes: ningún mensaje contiene el valor original completo', () => {
    const casos: [string, { ajustes: string[]; advertencias: string[]; rechazo: string | null }][] =
      [
        ['RUBÉN JIMÉNEZ EUÁN', sanearNombre('RUBÉN JIMÉNEZ EUÁN')],
        ['  esteban  torres aguilar ', sanearNombre('  esteban  torres aguilar ')],
        [' MANUEL.DIAZ.90@EJEMPLO.TEST ', sanearCorreo(' MANUEL.DIAZ.90@EJEMPLO.TEST ')],
        ['sin-arroba-ana@x', sanearCorreo('sin-arroba-ana@x')],
        ['(987) 662-8360', sanearTelefono('(987) 662-8360')],
        ['+52 998 607 9113', sanearTelefono('+52 998 607 9113')],
        ['12345', sanearTelefono('12345')],
      ];
    for (const [original, r] of casos) {
      const mensajes = [...r.ajustes, ...r.advertencias, ...(r.rechazo ? [r.rechazo] : [])];
      const normal = original.trim().toLowerCase();
      for (const m of mensajes) {
        expect(m.toLowerCase()).not.toContain(normal);
        expect(m).not.toContain(original);
      }
    }
    // Un nombre vacío rechaza con un mensaje que no cita ningún valor.
    expect(sanearNombre('   ').rechazo).not.toMatch(/\d/);
  });
});

describe('dividirNombre', () => {
  it('CP-305 divide_3_palabras: 1 nombre y 2 apellidos', () => {
    expect(dividirNombre('Leticia May Uc')).toEqual({
      nombre: 'Leticia',
      apellidoPaterno: 'May',
      apellidoMaterno: 'Uc',
    });
  });

  it('CP-306 divide_4_palabras: 2 nombres y 2 apellidos', () => {
    expect(dividirNombre('María Guadalupe López Pérez')).toEqual({
      nombre: 'María Guadalupe',
      apellidoPaterno: 'López',
      apellidoMaterno: 'Pérez',
    });
  });

  it('CP-307 divide_con_particulas: las partículas se pegan al apellido', () => {
    expect(dividirNombre('Juan Carlos de la Cruz Pérez')).toEqual({
      nombre: 'Juan Carlos',
      apellidoPaterno: 'de la Cruz',
      apellidoMaterno: 'Pérez',
    });
    expect(dividirNombre('Ana del Valle Ruiz')).toEqual({
      nombre: 'Ana',
      apellidoPaterno: 'del Valle',
      apellidoMaterno: 'Ruiz',
    });
    expect(dividirNombre('Luis Pérez de los Santos')).toEqual({
      nombre: 'Luis',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'de los Santos',
    });
  });

  it('CP-308 divide_2_palabras: nombre y paterno, materno vacío', () => {
    expect(dividirNombre('Rosa Pérez')).toEqual({
      nombre: 'Rosa',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: '',
    });
  });

  it('CP-308 una sola palabra deja los apellidos vacíos y 5 palabras dan 3 nombres', () => {
    expect(dividirNombre('Madonna')).toEqual({
      nombre: 'Madonna',
      apellidoPaterno: '',
      apellidoMaterno: '',
    });
    expect(dividirNombre('José Luis Miguel Soto Ruiz')).toEqual({
      nombre: 'José Luis Miguel',
      apellidoPaterno: 'Soto',
      apellidoMaterno: 'Ruiz',
    });
  });
});
