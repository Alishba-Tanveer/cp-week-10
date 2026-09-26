import {
  Controller,
  Get,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  async check(@Res({ passthrough: true }) response: Response) {
    const health = await this.healthService.check();

    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
