import { Module } from '@nestjs/common';
import { F0PdfService } from './pdf/f0-pdf.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, F0PdfService],
  exports: [F0PdfService],
})
export class ReportesModule {}
