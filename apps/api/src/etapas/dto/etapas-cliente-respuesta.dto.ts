import { EtapaTramite } from '../entities/etapa-tramite.entity';

// Una etapa del cliente con los datos del catálogo (número de paso y nombre) para mostrarla completa.
export class EtapaDelClienteRespuesta extends EtapaTramite {
  numero_paso: number;
  nombre: string;
}

// Las 16 etapas del cliente (0 a 15) y su avance global (promedio de las que no son "No aplica").
export class EtapasClienteRespuesta {
  avance_global: number;
  etapas: EtapaDelClienteRespuesta[];
}
