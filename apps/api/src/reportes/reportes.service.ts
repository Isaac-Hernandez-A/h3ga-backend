import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConsultaReporteDto } from './dto/consulta-reporte.dto';

@Injectable()
export class ReportesService {
  async consultarReporte(consulta: ConsultaReporteDto): Promise<unknown> {
    throw new NotImplementedException();
  }
}
