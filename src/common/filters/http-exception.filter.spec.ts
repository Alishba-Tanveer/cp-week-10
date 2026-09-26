import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const response = {
      status,
    };

    const request = {
      method: 'GET',
      url: '/test/error',
      requestId: 'filter-request-123',
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return {
      host,
      status,
      json,
    };
  }

  it('includes requestId in structured unexpected-error logs', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        nodeEnv: 'production',
      }),
    } as unknown as ConfigService;

    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const filter = new HttpExceptionFilter(configService);
    const { host } = createHost();

    filter.catch(new Error('unexpected failure'), host);

    expect(loggerSpy).toHaveBeenCalled();

    const loggedMessage = loggerSpy.mock.calls[0][0];

    expect(typeof loggedMessage).toBe('string');

    expect(JSON.parse(loggedMessage as string)).toEqual(
      expect.objectContaining({
        event: 'http.unhandled_exception',
        requestId: 'filter-request-123',
        method: 'GET',
        path: '/test/error',
        status: 500,
        message: 'unexpected failure',
        stack: expect.any(String),
      }),
    );

    loggerSpy.mockRestore();
  });

  it('returns detailed unexpected errors in development', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        nodeEnv: 'development',
      }),
    } as unknown as ConfigService;

    const filter = new HttpExceptionFilter(configService);
    const { host, status, json } = createHost();

    filter.catch(
      new Error('development-only diagnostic'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'development-only diagnostic',
        error: 'Internal Server Error',
        path: '/test/error',
      }),
    );
  });

  it('returns generic unexpected errors in production', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        nodeEnv: 'production',
      }),
    } as unknown as ConfigService;

    const filter = new HttpExceptionFilter(configService);
    const { host, status, json } = createHost();

    filter.catch(
      new Error('database password should never be exposed'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        path: '/test/error',
      }),
    );

    const body = json.mock.calls[0][0];

    expect(JSON.stringify(body)).not.toContain('database password');
  });

  it('preserves HttpException messages in production', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        nodeEnv: 'production',
      }),
    } as unknown as ConfigService;

    const filter = new HttpExceptionFilter(configService);
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        'Invalid request',
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid request',
        error: 'Bad Request',
        path: '/test/error',
      }),
    );
  });
});
