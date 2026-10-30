import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateEtapaTramiteDto } from './dto/create-etapa-tramite.dto';
import { UpdateEtapaTramiteDto } from './dto/update-etapa-tramite.dto';
import { EstatusTramite } from './entities/estatus-tramite.entity';
import { EtapaProceso } from './entities/etapa-proceso.entity';
import { EtapaTramite } from './entities/etapa-tramite.entity';
import { EtapaTramiteHistorial } from './entities/etapa-tramite-historial.entity';

@Injectable()
export class EtapasService {
  async listarEtapas(clienteId: string): Promise<EtapaTramite[]> {
    throw new NotImplementedException();
  }

  async crearEtapa(clienteId: string, dto: CreateEtapaTramiteDto): Promise<EtapaTramite> {
    throw new NotImplementedException();
  }

  async actualizarEtapa(
    clienteId: string,
    etapaTramiteId: string,
    dto: UpdateEtapaTramiteDto,
  ): Promise<EtapaTramite> {
    throw new NotImplementedException();
  }

  async listarHistorialEtapa(
    clienteId: string,
    etapaTramiteId: string,
  ): Promise<EtapaTramiteHistorial[]> {
    throw new NotImplementedException();
  }

  async listarCatalogoEtapas(): Promise<EtapaProceso[]> {
    throw new NotImplementedException();
  }

  async listarEstatus(): Promise<EstatusTramite[]> {
    throw new NotImplementedException();
  }
}
