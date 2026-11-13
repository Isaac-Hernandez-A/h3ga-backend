import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

// Respuesta de error uniforme: { statusCode, error, message, path, timestamp }. Sin dependencias de Nest
// en marcha: el adaptador HTTP se simula y se captura lo que responde.
function responder(excepcion: unknown) {
  let enviado: { cuerpo: Record<string, unknown>; estado: number } | undefined;
  const adaptador = {
    reply: (_res: unknown, cuerpo: Record<string, unknown>, estado: number) => {
      enviado = { cuerpo, estado };
    },
    getRequestUrl: () => '/api/v1/prueba',
  };
  const filtro = new AllExceptionsFilter({ httpAdapter: adaptador } as unknown as HttpAdapterHost);
  const host = {
    switchToHttp: () => ({ getResponse: () => ({}), getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  filtro.catch(excepcion, host);
  if (!enviado) throw new Error('El filtro no respondió.');
  return enviado;
}

describe('AllExceptionsFilter', () => {
  it('una HttpException de Nest conserva su estado y su mensaje', () => {
    const { estado, cuerpo } = responder(new NotFoundException('Cliente no encontrado.'));
    expect(estado).toBe(404);
    expect(cuerpo).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cliente no encontrado.',
      path: '/api/v1/prueba',
    });
  });

  it('un error inesperado responde 500 sin revelar el detalle', () => {
    const { estado, cuerpo } = responder(new Error('detalle interno secreto'));
    expect(estado).toBe(500);
    expect(cuerpo.message).toBe('Error interno del servidor');
  });

  it('CP-112 un cuerpo demasiado grande (error 413 del parser, que no es HttpException) responde 413 en español, no 500', () => {
    const errorDelParser = Object.assign(new Error('request entity too large'), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: 'entity.too.large',
    });
    const { estado, cuerpo } = responder(errorDelParser);
    expect(estado).toBe(413);
    expect(cuerpo).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'El cuerpo de la petición es demasiado grande.',
    });
  });

  it('CP-112 otros errores 4xx del parser conservan su estado; un objeto con estado 5xx sigue siendo 500', () => {
    const noSoportado = Object.assign(new Error('unsupported charset'), {
      status: 415,
      statusCode: 415,
      expose: true,
    });
    expect(responder(noSoportado).estado).toBe(415);
    expect(responder(Object.assign(new Error('x'), { status: 502, expose: false })).estado).toBe(
      500,
    );
    // Un "status" que no es un código HTTP de cliente no se toma como tal.
    expect(responder(Object.assign(new Error('x'), { status: 'raro' })).estado).toBe(500);
  });
});
