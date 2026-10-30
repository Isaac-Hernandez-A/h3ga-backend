import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvisosController } from './avisos.controller';
import { AvisosService } from './avisos.service';
import { Aviso } from './entities/aviso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Aviso])],
  controllers: [AvisosController],
  providers: [AvisosService],
  exports: [TypeOrmModule],
})
export class AvisosModule {}
