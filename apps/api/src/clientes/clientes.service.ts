import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateClienteAuxiliarDto } from './dto/create-cliente-auxiliar.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateHistorialLaboralDto } from './dto/create-historial-laboral.dto';
import { CreateInformacionIsssteDto } from './dto/create-informacion-issste.dto';
import { ReasignarClienteDto } from './dto/reasignar-cliente.dto';
import { ReemplazarObjetivosEspecificosDto } from './dto/reemplazar-objetivos-especificos.dto';
import { UpdateClienteAuxiliarDto } from './dto/update-cliente-auxiliar.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Afore } from './entities/afore.entity';
import { Cliente } from './entities/cliente.entity';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';
import { ClienteObjetivoEspecifico } from './entities/cliente-objetivo-especifico.entity';
import { HistorialLaboral } from './entities/historial-laboral.entity';
import { InformacionIssste } from './entities/informacion-issste.entity';
import { LeyProbable } from './entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from './entities/objetivo-especifico-inicial.entity';
import { RegimenPrincipal } from './entities/regimen-principal.entity';

@Injectable()
export class ClientesService {
  async listarClientes(): Promise<Cliente[]> {
    throw new NotImplementedException();
  }

  async obtenerCliente(clienteId: string): Promise<Cliente> {
    throw new NotImplementedException();
  }

  async crearCliente(dto: CreateClienteDto): Promise<Cliente> {
    throw new NotImplementedException();
  }

  async actualizarCliente(clienteId: string, dto: UpdateClienteDto): Promise<Cliente> {
    throw new NotImplementedException();
  }

  async reasignarAsesor(clienteId: string, dto: ReasignarClienteDto): Promise<Cliente> {
    throw new NotImplementedException();
  }

  async listarAuxiliares(clienteId: string): Promise<ClienteAuxiliar[]> {
    throw new NotImplementedException();
  }

  async asignarAuxiliar(
    clienteId: string,
    dto: CreateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    throw new NotImplementedException();
  }

  async actualizarAuxiliar(
    clienteId: string,
    clienteAuxiliarId: string,
    dto: UpdateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    throw new NotImplementedException();
  }

  async obtenerHistorialLaboral(clienteId: string): Promise<HistorialLaboral> {
    throw new NotImplementedException();
  }

  async guardarHistorialLaboral(
    clienteId: string,
    dto: CreateHistorialLaboralDto,
  ): Promise<HistorialLaboral> {
    throw new NotImplementedException();
  }

  async obtenerInformacionIssste(clienteId: string): Promise<InformacionIssste> {
    throw new NotImplementedException();
  }

  async guardarInformacionIssste(
    clienteId: string,
    dto: CreateInformacionIsssteDto,
  ): Promise<InformacionIssste> {
    throw new NotImplementedException();
  }

  async listarObjetivosEspecificos(clienteId: string): Promise<ClienteObjetivoEspecifico[]> {
    throw new NotImplementedException();
  }

  async reemplazarObjetivosEspecificos(
    clienteId: string,
    dto: ReemplazarObjetivosEspecificosDto,
  ): Promise<ClienteObjetivoEspecifico[]> {
    throw new NotImplementedException();
  }

  async listarRegimenes(): Promise<RegimenPrincipal[]> {
    throw new NotImplementedException();
  }

  async listarLeyesProbables(): Promise<LeyProbable[]> {
    throw new NotImplementedException();
  }

  async listarAfores(): Promise<Afore[]> {
    throw new NotImplementedException();
  }

  async listarObjetivosEspecificosInicial(): Promise<ObjetivoEspecificoInicial[]> {
    throw new NotImplementedException();
  }
}
