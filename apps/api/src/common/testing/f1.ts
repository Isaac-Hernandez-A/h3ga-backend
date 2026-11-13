import { AppConBd } from './bd-pruebas';
import {
  crearUsuarioPrueba,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  UsuarioPrueba,
} from './datos-clientes';
import { tokenDe } from './tokens';

// Ayudantes de las pruebas del F1 (Diagnóstico Especializado): cliente HTTP y usuarios ficticios.
export interface RespuestaHttp {
  estado: number;
  texto: string;
  json: never;
  tipo: string;
}

// `crudo` permite mandar texto que no es JSON válido. El cuerpo vacío (sin texto) devuelve json null.
export async function http(
  ctx: AppConBd,
  metodo: string,
  ruta: string,
  token?: string,
  cuerpo?: unknown,
  crudo?: string,
): Promise<RespuestaHttp> {
  const respuesta = await fetch(`${ctx.base}${ruta}`, {
    method: metodo,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cuerpo !== undefined || crudo !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  const tipo = respuesta.headers.get('content-type') ?? '';
  const texto = await respuesta.text();
  return {
    estado: respuesta.status,
    texto,
    tipo,
    json: (texto && tipo.includes('json') ? JSON.parse(texto) : null) as never,
  };
}

export interface EntornoF1 {
  catalogo: IdsCatalogo;
  asesor: UsuarioPrueba;
  otroAsesor: UsuarioPrueba;
  auxiliar: UsuarioPrueba;
  supervisor: UsuarioPrueba;
  t: (u: UsuarioPrueba) => string;
  // Cliente del asesor (sin diagnóstico).
  cliente: () => Promise<string>;
  // Cliente del asesor con el diagnóstico F1 ya creado (borrador vacío).
  clienteConDiagnostico: () => Promise<string>;
}

export async function entornoF1(ctx: AppConBd): Promise<EntornoF1> {
  const catalogo = await idsDeCatalogo(ctx.ds);
  const asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
  const otroAsesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
  const auxiliar = await crearUsuarioPrueba(ctx.ds, 'auxiliar');
  const supervisor = await crearUsuarioPrueba(ctx.ds, 'supervisor');
  const t = (u: UsuarioPrueba) => tokenDe(u.rol, u.id);
  const cliente = () => insertarCliente(ctx.ds, catalogo, asesor.id);
  const clienteConDiagnostico = async () => {
    const id = await cliente();
    const r = await http(ctx, 'POST', `/clientes/${id}/diagnostico`, t(asesor), {});
    if (r.estado !== 201) throw new Error(`No se pudo crear el diagnóstico de prueba: ${r.estado}`);
    return id;
  };
  return { catalogo, asesor, otroAsesor, auxiliar, supervisor, t, cliente, clienteConDiagnostico };
}
