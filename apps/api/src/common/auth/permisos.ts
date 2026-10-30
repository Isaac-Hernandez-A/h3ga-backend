export type Rol = 'asesor' | 'auxiliar' | 'supervisor';

const TODOS: Rol[] = ['asesor', 'auxiliar', 'supervisor'];
const ASESOR_SUPERVISOR: Rol[] = ['asesor', 'supervisor'];
const SUPERVISOR: Rol[] = ['supervisor'];

// PROVISIONAL: matriz supuesta mientras no se confirme la Tabla 2 (roles por módulo) de la Memoria.
// Es el único lugar donde se definen los roles permitidos por ruta; los controladores la consumen.
// Al confirmarla, ajustar los valores y poner PERMISOS_PROVISIONALES en false.
export const PERMISOS_PROVISIONALES = true;

export const PERMISOS = {
  catalogos: { leer: TODOS },
  usuarios: { leer: SUPERVISOR, escribir: SUPERVISOR },
  clientes: { leer: TODOS, crear: ASESOR_SUPERVISOR, editar: TODOS, auxiliares: ASESOR_SUPERVISOR },
  documentos: { leer: TODOS, escribir: TODOS },
  etapas: { leer: TODOS, escribir: ASESOR_SUPERVISOR },
  tramites: { leer: TODOS, escribir: TODOS },
  diagnosticos: { leer: TODOS, escribir: ASESOR_SUPERVISOR },
  agenda: { leer: ASESOR_SUPERVISOR, escribir: ASESOR_SUPERVISOR },
  avisos: { leer: TODOS, atender: TODOS },
  reportes: { leer: SUPERVISOR },
  etl: { importar: SUPERVISOR },
};
