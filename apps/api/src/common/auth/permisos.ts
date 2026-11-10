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
// - etapas.leer: el supervisor las consulta (monitorea el avance de clientes y asesores) y, por el RF-18,
//   el auxiliar las lee en solo lectura (D9); ClienteAccessGuard lo limita a los clientes que el asesor le
//   autorizó. Escribir etapas sigue solo para el asesor.
// - etl.importar: solo supervisor (la tabla no menciona el ETL).
// - catalogos.leer: todos los roles (la tabla no menciona catálogos).
// - clientes.consultar: los tres roles pueden listar y ver un cliente, pero el auxiliar solo los que el
//   asesor le autorizó. En el detalle (:clienteId) lo limita ClienteAccessGuard. El listado no pasa por
//   ese guard: cuando se implemente, el servicio debe filtrar por rol (asesor: los suyos; auxiliar: los
//   autorizados; supervisor: todos). El resto de las lecturas del expediente (clientes.leer) no incluye
//   al auxiliar.
// - avisos: se confirmó que el asesor también los ve y atiende, pero solo los de sus clientes. El
//   servicio debe filtrar por rol (asesor: los suyos; auxiliar: los de clientes autorizados;
//   supervisor: todos).
export const PERMISOS_PROVISIONALES = false;

export const PERMISOS = {
  catalogos: { leer: TODOS },
  usuarios: { leer: SUPERVISOR, escribir: SUPERVISOR },
  clientes: {
    consultar: TODOS,
    leer: ASESOR_SUPERVISOR,
    crear: ASESOR,
    editar: ASESOR,
    auxiliares: ASESOR,
    reasignar: SUPERVISOR,
  },
  documentos: { leer: TODOS, subir: ASESOR_AUXILIAR, revisar: TODOS },
  etapas: { leer: TODOS, escribir: ASESOR },
  tramites: { leer: ASESOR, escribir: ASESOR },
  diagnosticos: { leer: ASESOR, escribir: ASESOR },
  agenda: { leer: TODOS, escribir: ASESOR },
  avisos: { leer: TODOS, atender: TODOS },
  reportes: { leer: ASESOR_SUPERVISOR },
  etl: { importar: SUPERVISOR },
};
