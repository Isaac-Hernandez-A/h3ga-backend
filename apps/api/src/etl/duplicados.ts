import { RenglonValidado } from './tipos';

// Detección de duplicados (Actividad 5, Tarea 8). Se evalúa en el orden del arreglo y gana el primero.
// Los renglones ya rechazados no cuentan; un renglón rechazado por duplicado tampoco registra sus datos.
// Los mensajes citan la fila del primero, nunca la CURP ni el NSS.
//
// Limitación: el posible duplicado (mismo nombre y fecha de nacimiento con otro CURP) solo se compara
// contra renglones anteriores del archivo, no contra la base.
export interface Existentes {
  curps: Set<string>;
  nss: Set<string>;
}

const sinAcentos = (t: string) =>
  t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function marcarDuplicados(
  renglones: RenglonValidado[],
  existentes: Existentes,
): RenglonValidado[] {
  const curps = new Map<string, number>();
  const nss = new Map<string, number>();
  const personas = new Map<string, number>();

  return renglones.map((r) => {
    const d = r.datos;
    if (d === null || r.rechazos.length > 0) return r;

    const rechazos: string[] = [];
    if (existentes.curps.has(d.curp)) rechazos.push('CURP ya existe en la base.');
    if (d.nss !== null && existentes.nss.has(d.nss)) rechazos.push('NSS ya existe en la base.');
    const filaCurp = curps.get(d.curp);
    if (filaCurp !== undefined) {
      rechazos.push(`CURP duplicado en el archivo: ya aparece en la fila ${filaCurp}.`);
    }
    const filaNss = d.nss === null ? undefined : nss.get(d.nss);
    if (filaNss !== undefined) {
      rechazos.push(`NSS duplicado en el archivo: ya aparece en la fila ${filaNss}.`);
    }
    if (rechazos.length > 0) return { ...r, datos: null, rechazos };

    curps.set(d.curp, r.fila);
    if (d.nss !== null) nss.set(d.nss, r.fila);

    const persona = `${sinAcentos(`${d.nombre} ${d.apellidoPaterno} ${d.apellidoMaterno}`)}|${d.fechaNacimiento.toISOString()}`;
    const filaPersona = personas.get(persona);
    if (filaPersona === undefined) {
      personas.set(persona, r.fila);
      return r;
    }
    return {
      ...r,
      advertencias: [
        ...r.advertencias,
        `posible_duplicado: mismo nombre y fecha de nacimiento que la fila ${filaPersona}, con otro CURP.`,
      ],
    };
  });
}
