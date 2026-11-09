import { Module } from '@nestjs/common';
import { Reloj } from '../common/fechas';
import { F0PdfService } from './pdf/f0-pdf.service';
import { ReportePdfService } from './pdf/reporte-pdf.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, F0PdfService, ReportePdfService, Reloj],
  exports: [F0PdfService],
})
export class ReportesModule {}
