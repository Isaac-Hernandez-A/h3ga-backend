import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { getMetadataArgsStorage } from 'typeorm';
import { CreateClienteAuxiliarDto } from './dto/create-cliente-auxiliar.dto';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';

// RF-41: se guarda quién autorizó al auxiliar. Ese dato sale del token (lo llenará el servicio),
// nunca del cuerpo de la petición.
const AUXILIAR = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const OTRO_USUARIO = '55555555-5555-4555-8555-555555555555';

// Mismas opciones que el ValidationPipe global (app.setup.ts).
const validar = (cuerpo: object) =>
  validate(plainToInstance(CreateClienteAuxiliarDto, cuerpo), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('asignar un auxiliar al cliente', () => {
  it('la entidad ClienteAuxiliar exige autorizado_por (no admite NULL)', () => {
    const columna = getMetadataArgsStorage().columns.find(
      (c) => c.target === ClienteAuxiliar && c.propertyName === 'autorizado_por',
    );
    expect(columna).toBeDefined();
    expect(columna?.options.nullable).not.toBe(true);
  });

  it('el DTO acepta solo el auxiliar a asignar', async () => {
    expect(await validar({ auxiliar_id: AUXILIAR })).toHaveLength(0);
  });

  it('el DTO rechaza autorizado_por: no se pide al cliente de la API', async () => {
    const errores = await validar({ auxiliar_id: AUXILIAR, autorizado_por: OTRO_USUARIO });
    expect(errores.map((e) => e.property)).toContain('autorizado_por');
  });

  it('el DTO rechaza fecha_autorizacion: la pone el servidor', async () => {
    const errores = await validar({ auxiliar_id: AUXILIAR, fecha_autorizacion: '2026-01-01' });
    expect(errores.map((e) => e.property)).toContain('fecha_autorizacion');
  });
});
