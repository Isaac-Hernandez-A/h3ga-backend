// Repositorio simulado genérico y sin datos: permite montar la aplicación completa sin base de datos
// (p. ej. en la matriz de acceso) cuando una prueba no necesita datos de esa tabla.
export function repositorioVacio() {
  return {
    find: () => Promise.resolve([]),
    findBy: () => Promise.resolve([]),
    findOne: () => Promise.resolve(null),
    findOneBy: () => Promise.resolve(null),
    exists: () => Promise.resolve(false),
    existsBy: () => Promise.resolve(false),
    count: () => Promise.resolve(0),
    create: (datos: object) => ({ ...datos }),
    save: (entidad: object) => Promise.resolve(entidad),
  };
}
