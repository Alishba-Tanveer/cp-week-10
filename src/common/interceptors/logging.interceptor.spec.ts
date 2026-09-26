import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpiedFunction<Logger['log']>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createContext(
    headers: Record<string, string> = {},
    statusCode = 200,
  ): ExecutionContext {
    const request = {
      method: 'GET',
      url: '/health',
      originalUrl: '/health',
      headers,
      requestId: undefined,
    };

    const response = {
      statusCode,
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  it('logs method, path, status, duration, and request ID for a successful request', () => {
    const context = createContext({
      'x-request-id': 'test-request-123',
    });

    const next = {
      handle: () => of({ status: 'ok' }),
    };

    const result = interceptor.intercept(
      context,
      next,
    );

    result.subscribe();

    expect(logSpy).toHaveBeenCalledTimes(1);

    const loggedMessage = logSpy.mock.calls[0][0];

    expect(typeof loggedMessage).toBe('string');

    const logEntry = JSON.parse(loggedMessage as string) as {
      requestId: string;
      method: string;
      path: string;
      status: number;
      duration: number;
    };

    expect(logEntry).toMatchObject({
      requestId: 'test-request-123',
      method: 'GET',
      path: '/health',
      status: 200,
    });

    expect(typeof logEntry.duration).toBe('number');
    expect(logEntry.duration).toBeGreaterThanOrEqual(0);
  });

  it('generates and returns a request ID when one is not supplied', () => {
    const context = createContext();

    const next = {
      handle: () => of({ status: 'ok' }),
    };

    const result = interceptor.intercept(
      context,
      next,
    );

    result.subscribe();

    expect(logSpy).toHaveBeenCalledTimes(1);

    const loggedMessage = logSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedMessage as string) as {
      requestId: string;
    };

    expect(logEntry.requestId).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it('redacts authorization credentials in request logs', () => {
    const context = createContext({
      authorization: 'Bearer secret-access-token',
      'x-request-id': 'auth-request-123',
    });

    const next = {
      handle: () => of({ status: 'ok' }),
    };

    interceptor.intercept(context, next).subscribe();

    expect(logSpy).toHaveBeenCalledTimes(1);

    const loggedMessage = logSpy.mock.calls[0][0];

    expect(loggedMessage).toContain(
      'Bearer [REDACTED]',
    );

    expect(loggedMessage).not.toContain(
      'secret-access-token',
    );
  });

  it('does not log login passwords', () => {
    const context = createContext({
      authorization: 'Bearer secret-access-token',
    });

    const next = {
      handle: () =>
        of({
          email: 'user@example.com',
          password: 'super-secret-password',
        }),
    };

    interceptor.intercept(context, next).subscribe();

    expect(logSpy).toHaveBeenCalledTimes(1);

    const loggedMessage = logSpy.mock.calls[0][0];

    expect(loggedMessage).not.toContain(
      'super-secret-password',
    );
  });

  it('logs the correct status when a request throws an HTTP error', () => {
    const context = createContext({
      'x-request-id': 'error-request-123',
    });

    const next = {
      handle: () =>
        throwError(() => new UnauthorizedException()),
    };

    interceptor.intercept(context, next).subscribe({
      error: () => undefined,
    });

    expect(logSpy).toHaveBeenCalledTimes(1);

    const loggedMessage = logSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedMessage as string) as {
      requestId: string;
      method: string;
      path: string;
      status: number;
      duration: number;
    };

    expect(logEntry).toMatchObject({
      requestId: 'error-request-123',
      method: 'GET',
      path: '/health',
      status: 401,
    });

    expect(typeof logEntry.duration).toBe('number');
  });

  it('propagates the request ID through the response header', () => {
    const context = createContext({
      'x-request-id': 'header-request-123',
    });

    const next = {
      handle: () => of({ status: 'ok' }),
    };

    interceptor.intercept(context, next).subscribe();

    const http = context.switchToHttp();
    const response = http.getResponse<{
      setHeader: jest.Mock;
    }>();

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      'header-request-123',
    );
  });
});
