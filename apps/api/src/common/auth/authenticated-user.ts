export type Rol = 'asesor' | 'auxiliar' | 'supervisor';

// Usuario autenticado que los guards dejan en la petición. Es lo único que el resto del código
// conoce del token: así se puede integrar el módulo de login de otro estudiante sin cambios.
export interface AuthenticatedUser {
  sub: string;
  rol: Rol;
}

export const REQUEST_USER_KEY = 'user';

export interface RequestConUsuario {
  [REQUEST_USER_KEY]?: AuthenticatedUser;
}
