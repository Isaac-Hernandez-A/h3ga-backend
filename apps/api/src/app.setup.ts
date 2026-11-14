import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { opcionesCors } from './common/config/cors';

export const API_PREFIX = 'api/v1';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  // CORS solo para los orígenes de CORS_ORIGINS (por defecto, el frontend local).
  app.enableCors(opcionesCors(origenesConfigurados(app)));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Respeta @Exclude() (p. ej. usuarios.contrasena_hash nunca sale en una respuesta).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}

// La configuración viene de ConfigService; las pruebas que montan una aplicación mínima sin ConfigModule
// caen a la variable de entorno.
function origenesConfigurados(app: INestApplication): string | undefined {
  try {
    return app.get(ConfigService, { strict: false }).get<string>('CORS_ORIGINS');
  } catch {
    return process.env.CORS_ORIGINS;
  }
}
