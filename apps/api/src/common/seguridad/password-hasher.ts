import { Injectable } from '@nestjs/common';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';

// Costo de bcrypt acordado en D1.
const COSTO_BCRYPT = 10;

// Cifrado de contraseñas detrás de una abstracción (D1): el servicio de usuarios no conoce la librería.
// Es una clase abstracta (no una interfaz) para poder usarla como token de inyección.
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(plain: string, hash: string): Promise<boolean>;
}

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcryptHash(plain, COSTO_BCRYPT);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcryptCompare(plain, hash);
  }
}
