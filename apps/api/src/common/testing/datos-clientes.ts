import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Rol } from '../auth/authenticated-user';
import { ROL_ID } from '../auth/roles-sistema';

// Datos ficticios para las pruebas con base real (clientes y usuarios). Todo lo que se crea aquí se
// reconoce por una marca (correo @clientes-prueba.invalid y referido_por) y `limpiarDatosClientes` lo borra.
// La marca es única por archivo de prueba (cada archivo carga este módulo por separado): las suites corren
// en paralelo sobre la misma base y una no debe borrar los datos de otra. El dominio tampoco es
// @ejemplo.invalid, que limpia la suite de usuarios.
export const MARCA_CLIENTE = `prueba-clientes-${randomUUID().slice(0, 8)}`;
export const DOMINIO_USUARIOS = `@${MARCA_CLIENTE}.invalid`;

export interface UsuarioPrueba {
  id: string;
  rol: Rol;
}

export async function crearUsuarioPrueba(
  ds: DataSource,
  rol: Rol,
  extra: { activo?: boolean } = {},
): Promise<UsuarioPrueba> {
  const id = randomUUID();
  await ds.query(
    `INSERT INTO usuarios (id, rol_id, nombre, apellido_paterno, apellido_materno,
       correo_electronico, contrasena_hash, activo, fecha_creacion)
     VALUES ($1, $2, 'Prueba', 'Ficticio', 'Ficticio', $3, 'hash-ficticio-no-valido', $4, now())`,
    [id, ROL_ID[rol], `${rol}-${id}${DOMINIO_USUARIOS}`, extra.activo ?? true],
  );
  return { id, rol };
}

export interface IdsCatalogo {
  regimen_id: number;
  ley_probable_id: number;
  afore_id: number;
}

// Primer id de cada catálogo sembrado por las migraciones.
export async function idsDeCatalogo(ds: DataSource): Promise<IdsCatalogo> {
  const primero = async (tabla: string): Promise<number> => {
    const filas = await ds.query<{ id: number }[]>(`SELECT id FROM ${tabla} ORDER BY id LIMIT 1`);
    return filas[0].id;
  };
  return {
    regimen_id: await primero('regimen_principal'),
    ley_probable_id: await primero('ley_probable'),
    afore_id: await primero('afore'),
  };
}

// Cuerpo válido de POST /clientes (sin asesor_id: el servidor lo toma del token).
export function cuerpoCliente(catalogo: IdsCatalogo, extra: object = {}): Record<string, unknown> {
  return {
    nombre: 'Cliente',
    apellido_paterno: 'Ficticio',
    apellido_materno: 'Ficticio',
    referido_por: MARCA_CLIENTE,
    telefono: '9990000000',
    fecha_ingreso: '2026-11-01',
    correo_electronico: `cliente-${randomUUID()}${DOMINIO_USUARIOS}`,
    fecha_nacimiento: '1970-05-17',
    estado_civil: 'casado',
    dependientes_economicos: 2,
    regimen_id: catalogo.regimen_id,
    ley_probable_id: catalogo.ley_probable_id,
    semanas_imss_reconocidas: 500,
    tiene_issste: 'no',
    afore_id: catalogo.afore_id,
    observaciones_generales: 'Dato ficticio de prueba.',
    requiere_contadora: 'no',
    sexo: 'hombre',
    domicilio: 'Calle Ficticia 1',
    estado: 'Quintana Roo',
    subdelegacion_imss_probable: 'Subdelegación ficticia',
    cambio_afore: 'no',
    objetivo_cliente: 'pensionarse_asap',
    ...extra,
  };
}

// CURP ficticia con formato válido y letras al azar (evita choques con la restricción UNIQUE).
export function curpFicticia(): string {
  const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const letras = (n: number) => Array.from({ length: n }, letra).join('');
  const digitos = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  return `${letras(4)}${digitos(6)}HQR${letras(3)}A${digitos(1)}`;
}

// Inserta un cliente directamente en la base (sin pasar por la API) para preparar escenarios.
export async function insertarCliente(
  ds: DataSource,
  catalogo: IdsCatalogo,
  asesorId: string,
  extra: object = {},
): Promise<string> {
  const id = randomUUID();
  const c = { ...cuerpoCliente(catalogo), ...extra } as Record<string, unknown>;
  await ds.query(
    `INSERT INTO clientes (id, nombre, apellido_paterno, apellido_materno, referido_por, telefono,
       asesor_id, fecha_ingreso, correo_electronico, fecha_nacimiento, estado_civil,
       dependientes_economicos, regimen_id, ley_probable_id, semanas_imss_reconocidas, tiene_issste,
       afore_id, observaciones_generales, requiere_contadora, sexo, domicilio, estado,
       subdelegacion_imss_probable, cambio_afore, objetivo_cliente)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
    [
      id,
      c.nombre,
      c.apellido_paterno,
      c.apellido_materno,
      c.referido_por,
      c.telefono,
      asesorId,
      c.fecha_ingreso,
      c.correo_electronico,
      c.fecha_nacimiento,
      c.estado_civil,
      c.dependientes_economicos,
      c.regimen_id,
      c.ley_probable_id,
      c.semanas_imss_reconocidas,
      c.tiene_issste,
      c.afore_id,
      c.observaciones_generales,
      c.requiere_contadora,
      c.sexo,
      c.domicilio,
      c.estado,
      c.subdelegacion_imss_probable,
      c.cambio_afore,
      c.objetivo_cliente,
    ],
  );
  return id;
}

export async function autorizarEnBd(
  ds: DataSource,
  clienteId: string,
  auxiliarId: string,
  autorizadoPor: string,
  activo = true,
): Promise<void> {
  await ds.query(
    `INSERT INTO cliente_auxiliares (cliente_id, auxiliar_id, autorizado_por, fecha_autorizacion, activo)
     VALUES ($1, $2, $3, now(), $4)`,
    [clienteId, auxiliarId, autorizadoPor, activo],
  );
}

// Borra, en orden de dependencias, lo creado por las pruebas (solo filas con la marca de prueba).
export async function limpiarDatosClientes(ds: DataSource): Promise<void> {
  const clientes = `(SELECT id FROM clientes WHERE referido_por = '${MARCA_CLIENTE}')`;
  const usuarios = `(SELECT id FROM usuarios WHERE correo_electronico LIKE '%${DOMINIO_USUARIOS}')`;
  await ds.query(`DELETE FROM cliente_objetivos_especificos WHERE cliente_id IN ${clientes}`);
  await ds.query(`DELETE FROM historial_laboral WHERE cliente_id IN ${clientes}`);
  await ds.query(
    `DELETE FROM cliente_auxiliares WHERE cliente_id IN ${clientes} OR auxiliar_id IN ${usuarios}`,
  );
  await ds.query(`DELETE FROM clientes WHERE referido_por = '${MARCA_CLIENTE}'`);
  await ds.query(`DELETE FROM usuarios WHERE correo_electronico LIKE '%${DOMINIO_USUARIOS}'`);
}
