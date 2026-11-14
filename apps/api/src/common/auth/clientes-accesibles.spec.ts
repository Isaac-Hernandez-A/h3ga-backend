import { SelectQueryBuilder } from 'typeorm';
import { AuthenticatedUser } from './authenticated-user';
import { aplicarAlcanceClientes } from './clientes-accesibles';

const SUB = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';

// Constructor de consultas simulado: solo registra las condiciones que se le agregan.
function qbSimulado() {
  const llamadas: { condicion: string; parametros?: object }[] = [];
  const qb = {
    andWhere(condicion: string, parametros?: object) {
      llamadas.push({ condicion, parametros });
      return qb;
    },
  };
  return { qb: qb as unknown as SelectQueryBuilder<object>, llamadas };
}

describe('aplicarAlcanceClientes', () => {
  it('asesor: filtra por asesor_id = sub', () => {
    const { qb, llamadas } = qbSimulado();
    const usuario: AuthenticatedUser = { sub: SUB, rol: 'asesor' };
    expect(aplicarAlcanceClientes(qb, usuario, 'c')).toBe(qb);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].condicion).toContain('c.asesor_id =');
    expect(Object.values(llamadas[0].parametros ?? {})).toEqual([SUB]);
  });

  it('auxiliar: exige un registro ACTIVO en cliente_auxiliares con su sub', () => {
    const { qb, llamadas } = qbSimulado();
    aplicarAlcanceClientes(qb, { sub: SUB, rol: 'auxiliar' }, 'cli');
    expect(llamadas).toHaveLength(1);
    const { condicion, parametros } = llamadas[0];
    expect(condicion).toContain('cliente_auxiliares');
    expect(condicion).toContain('cli.id');
    expect(condicion).toContain('activo = true');
    expect(Object.values(parametros ?? {})).toEqual([SUB]);
  });

  it('supervisor: no agrega ningún filtro', () => {
    const { qb, llamadas } = qbSimulado();
    expect(aplicarAlcanceClientes(qb, { sub: SUB, rol: 'supervisor' }, 'c')).toBe(qb);
    expect(llamadas).toHaveLength(0);
  });

  it('rechaza un alias que no sea un identificador SQL simple', () => {
    const { qb } = qbSimulado();
    expect(() =>
      aplicarAlcanceClientes(qb, { sub: SUB, rol: 'asesor' }, 'c; DROP TABLE clientes'),
    ).toThrow();
  });
});
