import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Afore } from '../../clientes/entities/afore.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { HistorialLaboral } from '../../clientes/entities/historial-laboral.entity';
import { LeyProbable } from '../../clientes/entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from '../../clientes/entities/objetivo-especifico-inicial.entity';
import { fechaLocal } from '../../common/fechas';
import { Usuario } from '../../usuarios-roles/entities/usuario.entity';
import { dibujarF0 } from './f0-dibujo';
import { construirModeloF0 } from './f0-modelo';

// Genera el formato F0 (Diagnóstico Inicial) de un cliente con el diseño del formato oficial
// ("F0. Diagnóstico Inicial VF2"): ver f0-modelo.ts (qué se imprime en cada campo) y f0-dibujo.ts (cómo).
@Injectable()
export class F0PdfService {
  constructor(private readonly ds: DataSource) {}

  async generar(clienteId: string): Promise<Buffer> {
    const cliente = await this.ds.getRepository(Cliente).findOneBy({ id: clienteId });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const [ley, afore, asesor, historial, catalogoObjetivos, marcados, documentos, correcciones] =
      await Promise.all([
        this.ds.getRepository(LeyProbable).findOneBy({ id: cliente.ley_probable_id }),
        this.ds.getRepository(Afore).findOneBy({ id: cliente.afore_id }),
        this.ds.getRepository(Usuario).findOneBy({ id: cliente.asesor_id }),
        this.ds.getRepository(HistorialLaboral).findOneBy({ cliente_id: clienteId }),
        this.ds.getRepository(ObjetivoEspecificoInicial).find({ order: { id: 'ASC' } }),
        this.ds.query<{ objetivo_id: number }[]>(
          'SELECT objetivo_id FROM cliente_objetivos_especificos WHERE cliente_id = $1',
          [clienteId],
        ),
        this.ds.query<{ tipo: string; estatus: string; numero_referencia: string | null }[]>(
          `SELECT t.nombre AS tipo, d.estatus, d.numero_referencia
             FROM documentos_clientes d JOIN tipo_documento t ON t.id = d.tipo_documento_id
            WHERE d.cliente_id = $1`,
          [clienteId],
        ),
        this.ds.query<
          { tipo: string; observaciones: string | null; tiempo_promedio: string | null }[]
        >(
          `SELECT t.nombre AS tipo, c.observaciones, c.tiempo_promedio
             FROM correcciones_cliente c JOIN tipo_correccion t ON t.id = c.tipo_correccion_id
            WHERE c.cliente_id = $1 ORDER BY c.ctid`,
          [clienteId],
        ),
      ]);

    return dibujarF0(
      construirModeloF0({
        hoy: fechaLocal(new Date()),
        cliente,
        leyProbable: ley?.nombre ?? null,
        afore: afore?.nombre ?? null,
        asesor: asesor ? `${asesor.nombre} ${asesor.apellido_paterno}` : null,
        historial,
        catalogoObjetivos,
        objetivosMarcados: marcados.map((m) => m.objetivo_id),
        documentos,
        correcciones,
      }),
    );
  }
}
