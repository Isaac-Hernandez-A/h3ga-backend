import { Injectable, NotImplementedException } from '@nestjs/common';
import { ImportarExcelDto } from './dto/importar-excel.dto';

@Injectable()
export class EtlService {
  async importarExcel(dto: ImportarExcelDto): Promise<unknown> {
    throw new NotImplementedException();
  }
}
