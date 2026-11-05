import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../common/auth/publico.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Publico()
  @ApiOperation({ summary: 'Estado del servicio' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
