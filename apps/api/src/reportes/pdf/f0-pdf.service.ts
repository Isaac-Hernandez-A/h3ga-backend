import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Afore } from '../../clientes/entities/afore.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { ClienteObjetivoEspecifico } from '../../clientes/entities/cliente-objetivo-especifico.entity';
import { HistorialLaboral } from '../../clientes/entities/historial-laboral.entity';
import { InformacionIssste } from '../../clientes/entities/informacion-issste.entity';
import { LeyProbable } from '../../clientes/entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from '../../clientes/entities/objetivo-especifico-inicial.entity';
import { RegimenPrincipal } from '../../clientes/entities/regimen-principal.entity';
import { Usuario } from '../../usuarios-roles/entities/usuario.entity';

type Fila = [etiqueta: string, valor: string | number | boolean | null | undefined];

const SIN_DATO = '—';
const ETIQUETA_ESTADO: Record<string, string> = {
  si: 'Sí',
  no: 'No',
  por_confirmar: 'Por confirmar',
};

const texto = (v: Fila[1]): string => {
  if (v === null || v === undefined || v === '') return SIN_DATO;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
};
const estado = (v: string | null | undefined): string => (v ? (ETIQUETA_ESTADO[v] ?? v) : SIN_DATO);
// Los valores de enum se muestran legibles: pensionarse_asap -> Pensionarse asap.
const legible = (v: string | null | undefined): string =>
  v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : SIN_DATO;

// Genera el formato F0 (Diagnóstico Inicial) de un cliente. Es una versión con la misma información y una
// distribución simple por secciones: no replica posiciones exactas del formato oficial.
@Injectable()
export class F0PdfService {
  constructor(private readonly ds: DataSource) {}

  async generar(clienteId: string): Promise<Buffer> {
    const cliente = await this.ds.getRepository(Cliente).findOneBy({ id: clienteId });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const [regimen, ley, afore, asesor, historial, objetivos] = await Promise.all([
      this.ds.getRepository(RegimenPrincipal).findOneBy({ id: cliente.regimen_id }),
      this.ds.getRepository(LeyProbable).findOneBy({ id: cliente.ley_probable_id }),
      this.ds.getRepository(Afore).findOneBy({ id: cliente.afore_id }),
      this.ds.getRepository(Usuario).findOneBy({ id: cliente.asesor_id }),
      this.ds.getRepository(HistorialLaboral).findOneBy({ cliente_id: clienteId }),
      this.nombresDeObjetivos(clienteId),
    ]);
    const issste = historial
      ? await this.ds
          .getRepository(InformacionIssste)
          .findOneBy({ historial_laboral_id: historial.id })
      : null;

    return this.dibujar([
      [
        'Datos del cliente',
        [
          [
            'Nombre completo',
            `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno}`,
          ],
          ['Fecha de ingreso', cliente.fecha_ingreso],
          ['Referido por', cliente.referido_por],
          ['Teléfono', cliente.telefono],
          ['Correo electrónico', cliente.correo_electronico],
          ['CURP', cliente.curp],
          ['RFC', cliente.rfc],
          ['NSS', cliente.nss],
          ['INE (clave de elector)', cliente.ine],
          ['Fecha de nacimiento', cliente.fecha_nacimiento],
          ['Sexo', legible(cliente.sexo)],
          ['Estado civil', legible(cliente.estado_civil)],
          ['Dependientes económicos', cliente.dependientes_economicos],
          ['Ocupación', cliente.ocupacion],
          ['Domicilio', cliente.domicilio],
          ['Estado', cliente.estado],
        ],
      ],
      [
        'Situación pensionaria',
        [
          ['Régimen principal', regimen?.nombre],
          ['Ley probable', ley?.nombre],
          ['Semanas IMSS reconocidas', cliente.semanas_imss_reconocidas],
          ['Semanas a recuperar', cliente.semanas_a_recuperar],
          ['Subdelegación IMSS probable', cliente.subdelegacion_imss_probable],
          ['Tiene ISSSTE', estado(cliente.tiene_issste)],
          ['AFORE', afore?.nombre],
          ['Cambio de AFORE', estado(cliente.cambio_afore)],
          ['Requiere contadora', estado(cliente.requiere_contadora)],
          ['Objetivo del cliente', legible(cliente.objetivo_cliente)],
        ],
      ],
      [
        'Historial laboral',
        historial
          ? [
              ['Semanas ISSSTE', historial.semanas_issste],
              ['Salario promedio', `$${historial.salario_promedio.toFixed(2)}`],
              ['Último patrón', historial.ultimo_patron],
              ['Vigencia de derechos', estado(historial.vigencia_derechos)],
            ]
          : [['Historial laboral', 'Sin registrar']],
      ],
      ...(issste
        ? ([
            [
              'Información ISSSTE',
              [
                ['NSS ISSSTE', issste.nss_issste],
                ['Régimen pensionario', issste.regimen_pensionario],
                ['Años laborados', issste.anios_laborados],
              ],
            ],
          ] as [string, Fila[]][])
        : []),
      [
        'Objetivos específicos',
        objetivos.length > 0 ? objetivos.map((n): Fila => ['•', n]) : [['Objetivos', 'Sin marcar']],
      ],
      ['Observaciones generales', [['', cliente.observaciones_generales]]],
      [
        'Asesor responsable',
        [['Asesor', asesor ? `${asesor.nombre} ${asesor.apellido_paterno}` : null]],
      ],
    ]);
  }

  private async nombresDeObjetivos(clienteId: string): Promise<string[]> {
    const filas = await this.ds
      .getRepository(ObjetivoEspecificoInicial)
      .createQueryBuilder('o')
      .innerJoin(ClienteObjetivoEspecifico, 'co', 'co.objetivo_id = o.id')
      .where('co.cliente_id = :clienteId', { clienteId })
      .orderBy('o.id', 'ASC')
      .getMany();
    return filas.map((o) => o.nombre);
  }

  private dibujar(secciones: [string, Fila[]][]): Promise<Buffer> {
    return new Promise<Buffer>((resolver, rechazar) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: { Title: 'Formato F0 - Diagnóstico Inicial', Author: 'H3GA Seguros y Pensiones' },
      });
      const partes: Buffer[] = [];
      doc.on('data', (parte: Buffer) => partes.push(parte));
      doc.on('end', () => resolver(Buffer.concat(partes)));
      doc.on('error', rechazar);

      doc.font('Helvetica-Bold').fontSize(16).text('H3GA Seguros y Pensiones', { align: 'center' });
      doc.fontSize(13).text('Formato F0. Diagnóstico Inicial', { align: 'center' });
      doc.moveDown();

      for (const [titulo, filas] of secciones) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f3a5f').text(titulo);
        doc.moveDown(0.2);
        doc.fillColor('black').fontSize(10);
        for (const [etiqueta, valor] of filas) {
          if (etiqueta === '') {
            doc.font('Helvetica').text(texto(valor));
          } else {
            doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true });
            doc.font('Helvetica').text(texto(valor));
          }
        }
        doc.moveDown(0.8);
      }
      doc.end();
    });
  }
}
