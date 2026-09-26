import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';

import { RedactingLogger } from '../logging/redacting-logger';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new RedactingLogger(
    LoggingInterceptor.name,
  );

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();

    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const method = request.method;
    const path = request.originalUrl ?? request.url;
    const authorization = request.headers.authorization;
    const start = process.hrtime.bigint();

    const logRequest = (status: number): void => {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

      const logEntry = {
        requestId,
        method,
        path,
        status,
        duration: Math.round(duration * 100) / 100,
        ...(authorization ? { authorization } : {}),
      };

      this.logger.log(JSON.stringify(logEntry));
    };

    return new Observable((subscriber) => {
      const subscription = next.handle().subscribe({
        next: (value) => {
          subscriber.next(value);
        },
        error: (error: unknown) => {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'getStatus' in error &&
            typeof error.getStatus === 'function'
              ? error.getStatus()
              : 500;

          logRequest(status);
          subscriber.error(error);
        },
        complete: () => {
          logRequest(response.statusCode);
          subscriber.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  }
}
