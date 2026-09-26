import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheck {
  status: 'up' | 'down';
  error?: string;
}

export interface HealthResult {
  status: 'ok' | 'error';
  checks: {
    application: HealthCheck;
    database: HealthCheck;
  };
}

@Injectable()
export class HealthService {
  private readonly databaseTimeoutMs = 2000;

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthResult> {
    const database = await this.checkDatabase();

    return {
      status: database.status === 'up' ? 'ok' : 'error',
      checks: {
        application: {
          status: 'up',
        },
        database,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await this.withTimeout(
        this.dataSource.query('SELECT 1'),
        this.databaseTimeoutMs,
      );

      return {
        status: 'up',
      };
    } catch {
      return {
        status: 'down',
        error: 'Database health check failed',
      };
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Database health check timed out'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
