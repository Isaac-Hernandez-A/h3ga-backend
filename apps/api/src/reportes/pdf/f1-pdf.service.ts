import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { cargarDatosF1, faltantesF1 } from './f1-datos';
import { dibujarF1 } from './f1-dibujo';

// Genera el formato F1 (Diagnóstico Especializado) de un cliente con el diseño del formato oficial. Antes de
// dibujarlo valida que esté completo (los campos que exige el formato): si faltan, responde 409 con la lista.
@Injectable()
export class F1PdfService {
  constructor(private readonly ds: DataSource) {}

  async generar(clienteId: string): Promise<{ pdf: Buffer; nombreArchivo: string }> {
    const cargado = await cargarDatosF1(this.ds, clienteId);
    if (!cargado) throw new NotFoundException('Cliente no encontrado.');
    if (!cargado.datos) {
      throw new ConflictException('Primero crea el diagnóstico especializado (F1).');
    }
    const faltantes = faltantesF1(cargado.datos);
    if (faltantes.length > 0) {
      throw new ConflictException({
        message: `El diagnóstico F1 está incompleto: faltan ${faltantes.length} ${faltantes.length === 1 ? 'campo' : 'campos'}.`,
        faltantes,
      });
    }
    const { cliente } = cargado;
    const persona = [cliente.nombre, cliente.apellido_paterno]
      .join(' ')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return {
      pdf: await dibujarF1(cargado.datos),
      nombreArchivo: `Diagnostico-especializado-F1-${persona || 'cliente'}.pdf`,
    };
  }
}
