import { DataSource } from 'typeorm';

import { HealthService } from './health.service';

describe('HealthService', () => {
  const createDataSource = () =>
    ({
      query: jest.fn(),
    }) as unknown as DataSource;

  it('reports application and database as up when SELECT 1 succeeds', async () => {
    const dataSource = createDataSource();
    dataSource.query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const service = new HealthService(dataSource);

    await expect(service.check()).resolves.toEqual({
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

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports the database as down when the query fails', async () => {
    const dataSource = createDataSource();
    dataSource.query = jest
      .fn()
      .mockRejectedValue(new Error('database unavailable'));

    const service = new HealthService(dataSource);

    await expect(service.check()).resolves.toEqual({
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
    });
  });

  it('reports the database as down when the query exceeds the timeout', async () => {
    const dataSource = createDataSource();

    dataSource.query = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ '?column?': 1 }]), 2500);
        }),
    );

    const service = new HealthService(dataSource);

    const start = Date.now();
    const result = await service.check();
    const duration = Date.now() - start;

    expect(result).toEqual({
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
    });

    expect(duration).toBeLessThan(2300);
  });
});
