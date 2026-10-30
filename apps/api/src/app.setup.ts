import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const API_PREFIX = 'api/v1';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Respeta @Exclude() (p. ej. usuarios.contrasena_hash nunca sale en una respuesta).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
