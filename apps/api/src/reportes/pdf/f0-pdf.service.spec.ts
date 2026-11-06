import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { AppConBd, describeConBd, iniciarAppConBd } from '../../common/testing/bd-pruebas';
import {
  crearUsuarioPrueba,
  curpFicticia,
  IdsCatalogo,
  idsDeCatalogo,
  insertarCliente,
  limpiarDatosClientes,
  UsuarioPrueba,
} from '../../common/testing/datos-clientes';
import { textoDePdf as textoDe } from '../../common/testing/texto-de-pdf';
import { F0PdfService } from './f0-pdf.service';

// Generación del formato F0 contra la base de pruebas real; el texto se lee de vuelta con pdf-parse.
jest.setTimeout(60_000);

describeConBd('F0PdfService (base de pruebas)', () => {
  let ctx: AppConBd;
  let servicio: F0PdfService;
  let catalogo: IdsCatalogo;
  let asesor: UsuarioPrueba;

  beforeAll(async () => {
    ctx = await iniciarAppConBd();
    servicio = ctx.app.get(F0PdfService);
    catalogo = await idsDeCatalogo(ctx.ds);
    asesor = await crearUsuarioPrueba(ctx.ds, 'asesor');
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosClientes(ctx.ds);
    await ctx.app.close();
  });

  it('CP-51 el texto del PDF contiene el nombre y la CURP del cliente de prueba', async () => {
    const curp = curpFicticia();
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id, {
      nombre: 'José Ángel',
      apellido_paterno: 'Pérez',
      apellido_materno: 'Núñez',
    });
    await ctx.ds.query(
      "UPDATE clientes SET curp = $2, rfc = 'PEPJ700517AB1', nss = '12345678901', ocupacion = 'Docente' WHERE id = $1",
      [clienteId, curp],
    );
    await ctx.ds.query(
      `INSERT INTO historial_laboral (cliente_id, semanas_issste, salario_promedio, ultimo_patron, vigencia_derechos, activo)
       VALUES ($1, 120, 15234.5, 'Patrón ficticio S.A.', 'si', true)`,
      [clienteId],
    );
    const objetivo = await ctx.ds.query<{ id: number; nombre: string }[]>(
      'SELECT id, nombre FROM objetivo_especifico_inicial ORDER BY id LIMIT 1',
    );
    await ctx.ds.query(
      'INSERT INTO cliente_objetivos_especificos (cliente_id, objetivo_id) VALUES ($1, $2)',
      [clienteId, objetivo[0].id],
    );

    const pdf = await servicio.generar(clienteId);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const texto = await textoDe(pdf);
    expect(texto).toContain('José Ángel');
    expect(texto).toContain('Pérez');
    expect(texto).toContain('Núñez');
    expect(texto).toContain(curp);
    expect(texto).toContain('PEPJ700517AB1');
    expect(texto).toContain('Patrón ficticio S.A.');
    expect(texto).toContain(objetivo[0].nombre);
    expect(texto).toContain('IMSS'); // régimen del catálogo
  });

  it('CP-52 un cliente sin datos opcionales genera el PDF sin error', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    // Sin CURP, RFC, NSS, ocupación, INE, semanas a recuperar, historial laboral ni objetivos.
    const pdf = await servicio.generar(clienteId);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const texto = await textoDe(pdf);
    expect(texto).toContain('Cliente');
    expect(texto).not.toMatch(/undefined|null|NaN/);
  });

  it('un cliente que no existe responde 404', async () => {
    await expect(servicio.generar(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('CP-54 mide e imprime el tiempo de generación (sin umbral)', async () => {
    const clienteId = await insertarCliente(ctx.ds, catalogo, asesor.id);
    await servicio.generar(clienteId); // calentamiento
    const t0 = process.hrtime.bigint();
    const pdf = await servicio.generar(clienteId);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.info(`[CP-54] Generación del PDF F0: ${ms.toFixed(1)} ms (${pdf.length} bytes)`);
    expect(ms).toBeGreaterThan(0);
  });
});
