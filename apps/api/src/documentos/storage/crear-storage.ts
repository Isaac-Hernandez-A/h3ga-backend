import { join } from 'node:path';
import { LocalStorageAdapter } from './local-storage.adapter';
import {
  ConfiguracionSpaces,
  crearClienteS3,
  SpacesStorageAdapter,
} from './spaces-storage.adapter';
import { StorageService } from './storage.service';
import { VARIABLES_SPACES } from './variables-spaces';

// Elige el almacenamiento según STORAGE_DRIVER (local por defecto). Los mensajes de error solo nombran
// las variables que faltan, nunca sus valores.
export function crearStorage(env: Record<string, string | undefined>): StorageService {
  const driver = env.STORAGE_DRIVER?.trim() || 'local';
  if (driver === 'local') {
    return new LocalStorageAdapter(
      env.STORAGE_LOCAL_DIR?.trim() || join(process.cwd(), 'almacenamiento'),
    );
  }
  if (driver === 'spaces') {
    const faltan = VARIABLES_SPACES.filter((nombre) => !env[nombre]?.trim());
    if (faltan.length > 0) {
      throw new Error(`STORAGE_DRIVER=spaces requiere definir: ${faltan.join(', ')}.`);
    }
    const config = Object.fromEntries(
      VARIABLES_SPACES.map((nombre) => [nombre, env[nombre] as string]),
    ) as unknown as ConfiguracionSpaces;
    return new SpacesStorageAdapter(crearClienteS3(config), config.SPACES_BUCKET);
  }
  throw new Error(`STORAGE_DRIVER debe ser "local" o "spaces" (recibido: "${driver}").`);
}
