import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  const createResponse = () => {
    const response = {
      status: jest.fn(),
    };

    return response as unknown as Response;
  };

  it('returns 200-compatible healthy response', async () => {
    const healthService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: {
          application: {
            status: 'up',
          },
          database: {
            status: 'up',
          },
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);
    const response = createResponse();

    const result = await controller.check(response);

    expect(result).toEqual({
      status: 'ok',
      checks: {
        application: {
          status: 'up',
        },
        database: {
          status: 'up',
        },
      },
    });

    expect(response.status).not.toHaveBeenCalled();
  });

  it('sets 503 when the database is down', async () => {
    const healthService = {
      check: jest.fn().mockResolvedValue({
        status: 'error',
        checks: {
          application: {
            status: 'up',
          },
          database: {
            status: 'down',
            error: 'Database health check failed',
          },
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);
    const response = createResponse();

    const result = await controller.check(response);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    expect(result.status).toBe('error');
    expect(result.checks.database.status).toBe('down');
  });
});
