import { Rol } from './authenticated-user';

// Único lugar que relaciona el rol del token (asesor, auxiliar, supervisor) con roles.id.
// Los ids son los de la semilla de roles (migración 202610301007); la prueba de usuarios-roles verifica
// contra la base que siguen coincidiendo. Complementa a normalizarRol (token) para validaciones de servidor.
export const ROL_ID: Record<Rol, number> = {
  asesor: 1,
  auxiliar: 2,
  supervisor: 3,
};

// Sentido inverso (roles.id -> rol del sistema): lo usa el login para decidir el claim "rol" del token.
export const ROL_POR_ID: Record<number, Rol> = Object.fromEntries(
  (Object.entries(ROL_ID) as [Rol, number][]).map(([rol, id]) => [id, rol]),
);
