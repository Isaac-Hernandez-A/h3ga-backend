import { columnaDeCorreccion, errorDeDatoCorrecto } from './reglas-correcciones';

// Regla D2: qué correcciones F2 modifican el expediente y cómo se valida su dato_correcto.
const CURP = 'Corrección de CURP';
const RFC = 'Corrección de RFC';
const NACIMIENTO = 'Corrección de Fecha o Lugar de Nacimiento';
const SEXO = 'Corrección de Sexo / Género';
const NOMBRE = 'Corrección de Nombre y/o Apellidos';

describe('columnaDeCorreccion', () => {
  it('CURP, RFC, nacimiento, sexo y nombre actualizan su columna de clientes', () => {
    expect(columnaDeCorreccion(CURP)).toBe('curp');
    expect(columnaDeCorreccion(RFC)).toBe('rfc');
    expect(columnaDeCorreccion(NACIMIENTO)).toBe('fecha_nacimiento');
    expect(columnaDeCorreccion(SEXO)).toBe('sexo');
    expect(columnaDeCorreccion(NOMBRE)).toBe('nombre');
  });

  it('Acta, AFORE, Actualización IMSS, Otro y el resto solo registran el trámite', () => {
    for (const nombre of [
      'Corrección de Acta de Nacimiento',
      'Corrección de Datos en AFORE',
      'Regularización / Actualización de Datos ante IMSS (SINDO)',
      'Otro',
      'Corrección de Domicilio',
      'Corrección de Clave de Elector (INE)',
      'Unificación de NSS (Duplicidad / Multiplicidad)',
    ]) {
      expect(columnaDeCorreccion(nombre)).toBeUndefined();
    }
  });
});

describe('errorDeDatoCorrecto', () => {
  it('los tipos que actualizan el expediente exigen dato_correcto', () => {
    for (const tipo of [CURP, RFC, NACIMIENTO, SEXO, NOMBRE]) {
      expect(errorDeDatoCorrecto(tipo, undefined)).toMatch(/dato_correcto/);
      expect(errorDeDatoCorrecto(tipo, '   ')).toMatch(/dato_correcto/);
    }
  });

  it('los demás tipos no lo exigen ni lo validan', () => {
    expect(errorDeDatoCorrecto('Otro', undefined)).toBeNull();
    expect(errorDeDatoCorrecto('Corrección de Datos en AFORE', 'cualquier texto')).toBeNull();
  });

  it('valida el formato de la CURP', () => {
    expect(errorDeDatoCorrecto(CURP, 'PEPJ700517HQRRRN09')).toBeNull();
    expect(errorDeDatoCorrecto(CURP, 'CURP-MALA')).not.toBeNull();
    expect(errorDeDatoCorrecto(CURP, 'pepj700517hqrrrn09')).not.toBeNull();
  });

  it('valida el formato del RFC (12 o 13 caracteres)', () => {
    expect(errorDeDatoCorrecto(RFC, 'PEPJ700517AB1')).toBeNull();
    expect(errorDeDatoCorrecto(RFC, 'PEP700517AB1')).toBeNull();
    expect(errorDeDatoCorrecto(RFC, 'RFC-MALO')).not.toBeNull();
  });

  it('la fecha de nacimiento debe ser una fecha real AAAA-MM-DD', () => {
    expect(errorDeDatoCorrecto(NACIMIENTO, '1980-02-28')).toBeNull();
    expect(errorDeDatoCorrecto(NACIMIENTO, '1980-02-30')).not.toBeNull();
    expect(errorDeDatoCorrecto(NACIMIENTO, 'Mérida, Yucatán')).not.toBeNull();
  });

  it('el sexo debe ser hombre o mujer', () => {
    expect(errorDeDatoCorrecto(SEXO, 'mujer')).toBeNull();
    expect(errorDeDatoCorrecto(SEXO, 'otro')).not.toBeNull();
  });

  it('el nombre solo exige texto no vacío', () => {
    expect(errorDeDatoCorrecto(NOMBRE, 'María Fernanda')).toBeNull();
  });
});
