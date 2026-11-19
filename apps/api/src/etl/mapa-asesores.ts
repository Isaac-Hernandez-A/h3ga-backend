import { Rol } from '../common/auth/authenticated-user';

// Equivalencias de asesores (Actividad 5, Tarea 7): el Excel trae el nombre del asesor ("Lic. Marco
// Hernández") y el sistema necesita su usuario. La equivalencia nombre a correo viene de un JSON; el
// usuario se busca por correo. Sin equivalencia, usuario inexistente, inactivo o sin rol Asesor: rechazo.
export interface UsuarioBuscado {
  id: string; // usuarios.id (uuid)
  activo: boolean;
  rol: Rol;
}

export interface UsuariosLookup {
  buscarPorCorreo(correo: string): Promise<UsuarioBuscado | null>;
}

export type ResultadoAsesor = { usuarioId: string } | { rechazo: string };

// Clave de comparación: sin acentos, en minúsculas, sin espacios de más y sin el "Lic." del inicio.
function claveDeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:licda|lic)\.?(?:\s+|$)/, '')
    .trim();
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

export class MapaAsesores {
  // clave de nombre a correo normalizado
  private readonly correos = new Map<string, string>();
  // Una sola consulta por correo, aunque el asesor aparezca en muchos renglones.
  private readonly usuarios = new Map<string, Promise<UsuarioBuscado | null>>();

  constructor(
    equivalencias: Record<string, string>,
    private readonly lookup: UsuariosLookup,
  ) {
    const origen = new Map<string, string>();
    for (const [nombre, correo] of Object.entries(equivalencias)) {
      const clave = claveDeNombre(nombre);
      const normalizado = normalizarCorreo(correo);
      const previo = this.correos.get(clave);
      if (previo !== undefined && previo !== normalizado) {
        throw new Error(
          `Equivalencias de asesores en conflicto: "${origen.get(clave)}" y "${nombre}" se leen como el mismo nombre pero apuntan a correos distintos.`,
        );
      }
      this.correos.set(clave, normalizado);
      origen.set(clave, nombre);
    }
  }

  async resolver(nombreExcel: unknown): Promise<ResultadoAsesor> {
    const nombre = typeof nombreExcel === 'string' ? nombreExcel.trim() : '';
    const clave = claveDeNombre(nombre);
    if (clave === '') return { rechazo: 'El asesor viene vacío.' };

    const correo = this.correos.get(clave);
    if (correo === undefined) return { rechazo: `Asesor sin equivalencia: ${nombre}.` };

    let consulta = this.usuarios.get(correo);
    if (!consulta) {
      consulta = this.lookup.buscarPorCorreo(correo);
      this.usuarios.set(correo, consulta);
    }
    const usuario = await consulta;
    if (!usuario) {
      return { rechazo: `La equivalencia del asesor ${nombre} apunta a un usuario que no existe.` };
    }
    if (!usuario.activo) {
      return { rechazo: `El usuario equivalente del asesor ${nombre} está inactivo.` };
    }
    if (usuario.rol !== 'asesor') {
      return { rechazo: `El usuario equivalente del asesor ${nombre} no tiene rol de asesor.` };
    }
    return { usuarioId: usuario.id };
  }
}
