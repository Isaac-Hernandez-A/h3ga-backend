import { SelectQueryBuilder } from 'typeorm';
import { AuthenticatedUser } from './authenticated-user';

// Limita una consulta de clientes al alcance del usuario (misma regla que ClienteAccessGuard, en SQL):
//  - asesor: sus clientes (asesor_id = sub)
//  - auxiliar: clientes con una autorización ACTIVA en cliente_auxiliares
//  - supervisor: sin filtro
// `aliasCliente` es el alias de la tabla clientes en la consulta. Se valida porque se concatena al SQL.
export function aplicarAlcanceClientes<T extends object>(
  qb: SelectQueryBuilder<T>,
  usuario: AuthenticatedUser,
  aliasCliente: string,
): SelectQueryBuilder<T> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(aliasCliente)) {
    throw new Error('Alias de cliente inválido.');
  }
  switch (usuario.rol) {
    case 'asesor':
      return qb.andWhere(`${aliasCliente}.asesor_id = :alcanceSub`, { alcanceSub: usuario.sub });
    case 'auxiliar':
      return qb.andWhere(
        `EXISTS (SELECT 1 FROM cliente_auxiliares ca_alcance
           WHERE ca_alcance.cliente_id = ${aliasCliente}.id
             AND ca_alcance.auxiliar_id = :alcanceSub
             AND ca_alcance.activo = true)`,
        { alcanceSub: usuario.sub },
      );
    case 'supervisor':
      return qb;
  }
}
