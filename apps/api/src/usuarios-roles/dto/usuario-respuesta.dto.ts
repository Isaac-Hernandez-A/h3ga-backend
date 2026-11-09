// Usuario tal como sale de la API: nunca incluye contrasena_hash.
export class UsuarioRespuesta {
  id: string;
  rol_id: number;
  tipo_asesor_id: number | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_electronico: string;
  activo: boolean;
  fecha_creacion: Date;
}
