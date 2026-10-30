import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { EventoAgenda } from './entities/evento-agenda.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventoAgenda])],
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [TypeOrmModule],
})
export class AgendaModule {}
