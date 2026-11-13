import { Module } from '@nestjs/common';
import { AvisosModule } from '../avisos/avisos.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// Comparte el Reloj de AvisosModule (una sola fuente de hora, fácil de fijar en las pruebas).
@Module({
  imports: [AvisosModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
