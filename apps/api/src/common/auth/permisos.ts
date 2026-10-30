import { Rol } from './authenticated-user';

const TODOS: Rol[] = ['asesor', 'auxiliar', 'supervisor'];
const ASESOR: Rol[] = ['asesor'];
const ASESOR_AUXILIAR: Rol[] = ['asesor', 'auxiliar'];
const ASESOR_SUPERVISOR: Rol[] = ['asesor', 'supervisor'];
const SUPERVISOR: Rol[] = ['supervisor'];

// Roles permitidos por ruta, según la Tabla 2 (Permisos por rol del sistema) de la Memoria.
// Es el único lugar donde se definen; los controladores la consumen con @Roles(...).
//
// Lo que la Tabla 2 no dice y se asumió (confirmar):
// - clientes.crear: solo asesor (la tabla habla de "gestionar sus clientes", no de quién los registra).
// - agenda.escribir: solo asesor (la tabla solo menciona consultar).
// - etapas.leer: el supervisor las consulta (monitorea el avance de clientes y asesores).
// - etl.importar: solo supervisor (la tabla no menciona el ETL).
// - catalogos.leer: todos los roles (la tabla no menciona catálogos).
// - avisos: la columna del asesor está vacía en la tabla; se confirmó que también los ve y atiende
//   (de sus clientes).
export const PERMISOS_PROVISIONALES = false;

export const PERMISOS = {
  catalogos: { leer: TODOS },
  usuarios: { leer: SUPERVISOR, escribir: SUPERVISOR },
  clientes: {
    leer: ASESOR_SUPERVISOR,
    crear: ASESOR,
    editar: ASESOR,
    auxiliares: ASESOR,
    reasignar: SUPERVISOR,
  },
  documentos: { leer: TODOS, subir: ASESOR_AUXILIAR, revisar: TODOS },
  etapas: { leer: ASESOR_SUPERVISOR, escribir: ASESOR },
  tramites: { leer: ASESOR, escribir: ASESOR },
  diagnosticos: { leer: ASESOR, escribir: ASESOR },
  agenda: { leer: TODOS, escribir: ASESOR },
  avisos: { leer: TODOS, atender: TODOS },
  reportes: { leer: ASESOR_SUPERVISOR },
  etl: { importar: SUPERVISOR },
};
