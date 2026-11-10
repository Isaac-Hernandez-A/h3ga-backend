import { Rol } from './authenticated-user';
import { PERMISOS } from './permisos';

const TODOS: Rol[] = ['asesor', 'auxiliar', 'supervisor'];

describe('PERMISOS.clientes', () => {
  // Se lee como diccionario abierto para que la prueba falle por aserción (y no por tipos)
  // mientras la clave `consultar` no exista.
  const clientes = PERMISOS.clientes as Record<string, Rol[] | undefined>;

  it('leer (resto del expediente) no incluye al auxiliar', () => {
    expect(clientes.leer).not.toContain('auxiliar');
  });

  it('consultar (listar y ver un cliente) incluye al asesor, al auxiliar y al supervisor', () => {
    expect(clientes.consultar).toEqual(expect.arrayContaining(TODOS));
  });

  it('no cambian los roles del resto de las acciones de clientes', () => {
    expect(clientes.leer).toEqual(['asesor', 'supervisor']);
    expect(clientes.crear).toEqual(['asesor']);
    expect(clientes.editar).toEqual(['asesor']);
    expect(clientes.auxiliares).toEqual(['asesor']);
    expect(clientes.reasignar).toEqual(['supervisor']);
  });
});

describe('PERMISOS de las demás áreas', () => {
  it('no cambian', () => {
    expect({
      catalogos: PERMISOS.catalogos,
      usuarios: PERMISOS.usuarios,
      documentos: PERMISOS.documentos,
      etapas: PERMISOS.etapas,
      tramites: PERMISOS.tramites,
      diagnosticos: PERMISOS.diagnosticos,
      agenda: PERMISOS.agenda,
      avisos: PERMISOS.avisos,
      reportes: PERMISOS.reportes,
      etl: PERMISOS.etl,
    }).toEqual({
      catalogos: { leer: TODOS },
      usuarios: { leer: ['supervisor'], escribir: ['supervisor'] },
      documentos: { leer: TODOS, subir: ['asesor', 'auxiliar'], revisar: TODOS },
      // D9: el auxiliar lee las etapas (solo de sus clientes autorizados, lo limita ClienteAccessGuard);
      // escribir sigue solo para el asesor.
      etapas: { leer: TODOS, escribir: ['asesor'] },
      tramites: { leer: ['asesor'], escribir: ['asesor'] },
      diagnosticos: { leer: ['asesor'], escribir: ['asesor'] },
      agenda: { leer: TODOS, escribir: ['asesor'] },
      avisos: { leer: TODOS, atender: TODOS },
      reportes: { leer: ['asesor', 'supervisor'] },
      etl: { importar: ['supervisor'] },
    });
  });
});
