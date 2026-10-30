import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OperationObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { PERMISOS_PROVISIONALES } from './common/auth/permisos';

export const SWAGGER_PATH = 'api/docs';

const TAGS: Array<[string, string]> = [
  ['usuarios-roles', 'Usuarios y roles (RBAC). tipos_asesor es de otro módulo: solo consulta.'],
  [
    'clientes',
    'Clientes, auxiliares asignados, historial laboral y objetivos del diagnóstico inicial (F0).',
  ],
  ['documentos', 'Documentos del cliente (los archivos viven en DigitalOcean Spaces).'],
  ['etapas', 'Seguimiento por etapas (0 a 15), estatus e historial de cambios.'],
  ['tramites', 'Trámites F2 a F4 (correcciones y unificación de NSS).'],
  ['diagnosticos', 'Diagnóstico especializado (F1) y sus secciones.'],
  ['agenda', 'Citas del asesor con sus clientes.'],
  ['avisos', 'Alertas por fechas compromiso y citas.'],
  ['reportes', 'Reportes (esbozo).'],
  ['etl', 'Importación desde Excel (esbozo).'],
  ['health', 'Estado del servicio.'],
];

export function setupSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('H3GA API')
    .setDescription(
      'Contrato REST del sistema H3GA Seguros y Pensiones. Las rutas están esbozadas: ' +
        'responden 501 hasta implementar la lógica de negocio. El token JWT lo emite el módulo de login. ' +
        'Para probar en desarrollo: `pnpm dev:token --rol asesor` y pegar el token en Authorize.',
    )
    .setVersion('0.1.0')
    .addBearerAuth();
  for (const [nombre, descripcion] of TAGS) builder.addTag(nombre, descripcion);

  const document = SwaggerModule.createDocument(app, builder.build());

  // Muestra en cada operación los roles declarados con @Roles(...).
  for (const ruta of Object.values(document.paths)) {
    for (const operacion of Object.values(ruta) as Array<
      OperationObject & { 'x-roles'?: string[] }
    >) {
      const roles = operacion?.['x-roles'];
      if (roles) {
        operacion.description = `Roles permitidos${PERMISOS_PROVISIONALES ? ' (provisional)' : ''}: ${roles.join(', ')}.`;
      }
    }
  }

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
  });
}
