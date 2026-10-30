import { Rol } from './authenticated-user';

// ÚNICO lugar donde el valor del claim "rol" del token se convierte en un Rol del sistema.
// El contrato acepta exactamente "asesor", "auxiliar" y "supervisor". Si el módulo de login emite
// otros valores (por ejemplo el nombre completo de la tabla roles), se agregan aquí y en ningún otro sitio.
const ROLES_ACEPTADOS: Record<string, Rol> = {
  asesor: 'asesor',
  auxiliar: 'auxiliar',
  supervisor: 'supervisor',
};

export function normalizarRol(valor: unknown): Rol | null {
  return typeof valor === 'string' ? (ROLES_ACEPTADOS[valor] ?? null) : null;
}
