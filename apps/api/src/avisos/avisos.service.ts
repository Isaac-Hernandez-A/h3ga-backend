import { Injectable, NotImplementedException } from '@nestjs/common';
import { ListarAvisosQueryDto } from './dto/listar-avisos-query.dto';
import { Aviso } from './entities/aviso.entity';

@Injectable()
export class AvisosService {
  async listarAvisos(consulta: ListarAvisosQueryDto): Promise<Aviso[]> {
    throw new NotImplementedException();
  }

  async obtenerAviso(avisoId: string): Promise<Aviso> {
    throw new NotImplementedException();
  }

  async atenderAviso(avisoId: string): Promise<Aviso> {
    throw new NotImplementedException();
  }
}
