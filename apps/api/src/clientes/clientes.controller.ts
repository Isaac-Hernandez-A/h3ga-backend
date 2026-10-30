import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
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
import { ClientesService } from './clientes.service';

@ApiTags('clientes')
@Controller()
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get('clientes')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiOkResponse({ type: Cliente, isArray: true })
  listarClientes(): Promise<Cliente[]> {
    return this.service.listarClientes();
  }

  @Get('clientes/:clienteId')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Obtener un cliente' })
  @ApiOkResponse({ type: Cliente })
  obtenerCliente(@Param('clienteId', ParseUUIDPipe) clienteId: string): Promise<Cliente> {
    return this.service.obtenerCliente(clienteId);
  }

  @Post('clientes')
  @Roles(...PERMISOS.clientes.crear)
  @ApiOperation({ summary: 'Registrar un cliente' })
  @ApiCreatedResponse({ type: Cliente })
  crearCliente(@Body() dto: CreateClienteDto): Promise<Cliente> {
    return this.service.crearCliente(dto);
  }

  @Patch('clientes/:clienteId')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiOkResponse({ type: Cliente })
  actualizarCliente(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: UpdateClienteDto,
  ): Promise<Cliente> {
    return this.service.actualizarCliente(clienteId, dto);
  }

  @Patch('clientes/:clienteId/asesor')
  @Roles(...PERMISOS.clientes.reasignar)
  @ApiOperation({ summary: 'Reasignar el expediente del cliente a otro asesor' })
  @ApiOkResponse({ type: Cliente })
  reasignarAsesor(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReasignarClienteDto,
  ): Promise<Cliente> {
    return this.service.reasignarAsesor(clienteId, dto);
  }

  @Get('clientes/:clienteId/auxiliares')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Listar auxiliares asignados al cliente' })
  @ApiOkResponse({ type: ClienteAuxiliar, isArray: true })
  listarAuxiliares(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<ClienteAuxiliar[]> {
    return this.service.listarAuxiliares(clienteId);
  }

  @Post('clientes/:clienteId/auxiliares')
  @Roles(...PERMISOS.clientes.auxiliares)
  @ApiOperation({ summary: 'Asignar un auxiliar al cliente' })
  @ApiCreatedResponse({ type: ClienteAuxiliar })
  asignarAuxiliar(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    return this.service.asignarAuxiliar(clienteId, dto);
  }

  @Patch('clientes/:clienteId/auxiliares/:clienteAuxiliarId')
  @Roles(...PERMISOS.clientes.auxiliares)
  @ApiOperation({ summary: 'Activar o desactivar la asignación de un auxiliar' })
  @ApiOkResponse({ type: ClienteAuxiliar })
  actualizarAuxiliar(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('clienteAuxiliarId', ParseUUIDPipe) clienteAuxiliarId: string,
    @Body() dto: UpdateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    return this.service.actualizarAuxiliar(clienteId, clienteAuxiliarId, dto);
  }

  @Get('clientes/:clienteId/historial-laboral')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Obtener el historial laboral' })
  @ApiOkResponse({ type: HistorialLaboral })
  obtenerHistorialLaboral(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<HistorialLaboral> {
    return this.service.obtenerHistorialLaboral(clienteId);
  }

  @Put('clientes/:clienteId/historial-laboral')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Crear o reemplazar el historial laboral' })
  @ApiOkResponse({ type: HistorialLaboral })
  guardarHistorialLaboral(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateHistorialLaboralDto,
  ): Promise<HistorialLaboral> {
    return this.service.guardarHistorialLaboral(clienteId, dto);
  }

  @Get('clientes/:clienteId/historial-laboral/issste')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Obtener la información ISSSTE' })
  @ApiOkResponse({ type: InformacionIssste })
  obtenerInformacionIssste(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<InformacionIssste> {
    return this.service.obtenerInformacionIssste(clienteId);
  }

  @Put('clientes/:clienteId/historial-laboral/issste')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Crear o reemplazar la información ISSSTE' })
  @ApiOkResponse({ type: InformacionIssste })
  guardarInformacionIssste(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateInformacionIsssteDto,
  ): Promise<InformacionIssste> {
    return this.service.guardarInformacionIssste(clienteId, dto);
  }

  @Get('clientes/:clienteId/objetivos-especificos')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Listar los objetivos específicos marcados (F0)' })
  @ApiOkResponse({ type: ClienteObjetivoEspecifico, isArray: true })
  listarObjetivosEspecificos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<ClienteObjetivoEspecifico[]> {
    return this.service.listarObjetivosEspecificos(clienteId);
  }

  @Put('clientes/:clienteId/objetivos-especificos')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Reemplazar los objetivos específicos marcados (F0)' })
  @ApiOkResponse({ type: ClienteObjetivoEspecifico, isArray: true })
  reemplazarObjetivosEspecificos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarObjetivosEspecificosDto,
  ): Promise<ClienteObjetivoEspecifico[]> {
    return this.service.reemplazarObjetivosEspecificos(clienteId, dto);
  }

  @Get('catalogos/regimenes')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar regímenes' })
  @ApiOkResponse({ type: RegimenPrincipal, isArray: true })
  listarRegimenes(): Promise<RegimenPrincipal[]> {
    return this.service.listarRegimenes();
  }

  @Get('catalogos/leyes-probables')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar leyes probables' })
  @ApiOkResponse({ type: LeyProbable, isArray: true })
  listarLeyesProbables(): Promise<LeyProbable[]> {
    return this.service.listarLeyesProbables();
  }

  @Get('catalogos/afores')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar AFORE' })
  @ApiOkResponse({ type: Afore, isArray: true })
  listarAfores(): Promise<Afore[]> {
    return this.service.listarAfores();
  }

  @Get('catalogos/objetivos-especificos')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar el catálogo de objetivos específicos (F0)' })
  @ApiOkResponse({ type: ObjetivoEspecificoInicial, isArray: true })
  listarObjetivosEspecificosInicial(): Promise<ObjetivoEspecificoInicial[]> {
    return this.service.listarObjetivosEspecificosInicial();
  }
}
