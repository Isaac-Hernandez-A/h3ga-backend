import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Rol } from '../common/auth/authenticated-user';
import { ROLES_KEY } from '../common/auth/roles.decorator';
import { ClientesController } from './clientes.controller';

// Metadatos de @Roles(...) de las rutas de clientes. Se localiza cada ruta por método HTTP y ruta
// (no por el nombre del método de la clase) para que la prueba describa el contrato REST.
const reflector = new Reflector();

function rolesDeLaRuta(metodo: keyof typeof RequestMethod, ruta: string): Rol[] {
  const prototipo = ClientesController.prototype as unknown as Record<string, () => unknown>;
  const handler = Object.getOwnPropertyNames(prototipo)
    .filter((nombre) => nombre !== 'constructor')
    .map((nombre) => prototipo[nombre])
    .find(
      (fn) =>
        reflector.get<string>(PATH_METADATA, fn) === ruta &&
        reflector.get<number>(METHOD_METADATA, fn) === RequestMethod[metodo],
    );
  if (!handler) throw new Error(`La ruta ${metodo} /${ruta} no existe en ClientesController.`);
  return reflector.get<Rol[]>(ROLES_KEY, handler) ?? [];
}

describe('ClientesController: roles por ruta', () => {
  describe('el auxiliar puede listar y ver clientes (solo los autorizados)', () => {
    it.each([
      ['GET', 'clientes'],
      ['GET', 'clientes/:clienteId'],
    ] as const)('%s /%s permite al auxiliar', (metodo, ruta) => {
      expect(rolesDeLaRuta(metodo, ruta)).toContain('auxiliar');
    });

    it.each([
      ['GET', 'clientes'],
      ['GET', 'clientes/:clienteId'],
    ] as const)('%s /%s sigue permitiendo al asesor y al supervisor', (metodo, ruta) => {
      expect(rolesDeLaRuta(metodo, ruta)).toEqual(expect.arrayContaining(['asesor', 'supervisor']));
    });
  });

  describe('el auxiliar no accede al resto del expediente', () => {
    it.each([
      ['GET', 'clientes/:clienteId/auxiliares'],
      ['GET', 'clientes/:clienteId/historial-laboral'],
      ['GET', 'clientes/:clienteId/historial-laboral/issste'],
      ['GET', 'clientes/:clienteId/objetivos-especificos'],
    ] as const)('%s /%s no permite al auxiliar', (metodo, ruta) => {
      expect(rolesDeLaRuta(metodo, ruta)).not.toContain('auxiliar');
    });
  });
});
