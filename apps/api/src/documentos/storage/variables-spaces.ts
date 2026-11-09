// Variables de entorno que exige STORAGE_DRIVER=spaces (sin valores aquí: se leen del entorno).
export const VARIABLES_SPACES = [
  'SPACES_KEY',
  'SPACES_SECRET',
  'SPACES_REGION',
  'SPACES_ENDPOINT',
  'SPACES_BUCKET',
] as const;
