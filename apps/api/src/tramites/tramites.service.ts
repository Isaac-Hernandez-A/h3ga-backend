import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateCorreccionClienteDto } from './dto/create-correccion-cliente.dto';
import { CreateUnificacionNssDetalleDto } from './dto/create-unificacion-nss-detalle.dto';
import { CreateUnificacionNssSecundarioDto } from './dto/create-unificacion-nss-secundario.dto';
import { UpdateCorreccionClienteDto } from './dto/update-correccion-cliente.dto';
import { CorreccionCliente } from './entities/correccion-cliente.entity';
import { TipoCorreccion } from './entities/tipo-correccion.entity';
import { UnificacionNssDetalle } from './entities/unificacion-nss-detalle.entity';
import { UnificacionNssSecundario } from './entities/unificacion-nss-secundario.entity';

@Injectable()
export class TramitesService {
  async listarCorrecciones(clienteId: string): Promise<CorreccionCliente[]> {
    throw new NotImplementedException();
  }

  async crearCorreccion(
    clienteId: string,
    dto: CreateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    throw new NotImplementedException();
  }

  async obtenerCorreccion(clienteId: string, correccionId: string): Promise<CorreccionCliente> {
    throw new NotImplementedException();
  }

  async actualizarCorreccion(
    clienteId: string,
    correccionId: string,
    dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    throw new NotImplementedException();
  }

  async obtenerUnificacionNss(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssDetalle> {
    throw new NotImplementedException();
  }

  async guardarUnificacionNss(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssDetalleDto,
  ): Promise<UnificacionNssDetalle> {
    throw new NotImplementedException();
  }

  async listarNssSecundarios(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssSecundario[]> {
    throw new NotImplementedException();
  }

  async agregarNssSecundario(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssSecundarioDto,
  ): Promise<UnificacionNssSecundario> {
    throw new NotImplementedException();
  }

  async listarTiposCorreccion(): Promise<TipoCorreccion[]> {
    throw new NotImplementedException();
  }
}
