import { JwtService } from '@nestjs/jwt';
import { Rol } from '../auth/authenticated-user';

// Ayudantes de prueba (nunca se usan en producción). Valores ficticios: no son secretos reales.
export const SECRETO_PRUEBA = 'secreto-ficticio-solo-para-pruebas';
export const SUB_POR_DEFECTO = '99999999-9999-4999-8999-999999999999';

const jwt = new JwtService({ secret: SECRETO_PRUEBA });
const ahora = () => Math.floor(Date.now() / 1000);

// Token válido (HS256, vigencia 5 minutos) con el contrato { sub, rol, exp }.
export function tokenDe(rol: Rol | string, sub: string = SUB_POR_DEFECTO): string {
  return jwt.sign({ sub, rol, exp: ahora() + 300 });
}

export function tokenVencido(rol: Rol, sub: string = SUB_POR_DEFECTO): string {
  return jwt.sign({ sub, rol, exp: ahora() - 60 });
}

export function tokenConFirmaInvalida(rol: Rol, sub: string = SUB_POR_DEFECTO): string {
  return new JwtService({ secret: 'otro-secreto-ficticio-solo-para-pruebas' }).sign({
    sub,
    rol,
    exp: ahora() + 300,
  });
}
