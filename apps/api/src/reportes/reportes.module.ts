import { Module } from '@nestjs/common';
import { Reloj } from '../common/fechas';
import { F1PdfService } from './pdf/f1-pdf.service';
import { F0PdfService } from './pdf/f0-pdf.service';
import { ReportePdfService } from './pdf/reporte-pdf.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, F0PdfService, F1PdfService, ReportePdfService, Reloj],
  exports: [F0PdfService, F1PdfService],
})
export class ReportesModule {}
