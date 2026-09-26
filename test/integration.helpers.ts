import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

export const TEST_PASSWORD = 'Assignment1TestPassword123!';

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
  }> = {},
): Promise<{ id: number; name: string; email: string }> {
  const user = {
    name: overrides.name ?? `Integration User ${Date.now()}`,
    email: overrides.email ?? `integration-${Date.now()}@example.com`,
    password: overrides.password ?? TEST_PASSWORD,
  };

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);

  return response.body;
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password = TEST_PASSWORD,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email,
      password,
    })
    .expect(200);

  return response.body.accessToken;
}

export async function registerAndLogin(
  app: INestApplication,
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
  }> = {},
): Promise<{
  user: { id: number; name: string; email: string };
  accessToken: string;
}> {
  const user = {
    name: overrides.name ?? `Integration User ${Date.now()}`,
    email: overrides.email ?? `integration-${Date.now()}@example.com`,
    password: overrides.password ?? TEST_PASSWORD,
  };

  const registeredUser = await registerUser(app, user);
  const accessToken = await loginUser(
    app,
    registeredUser.email,
    user.password,
  );

  return {
    user: registeredUser,
    accessToken,
  };
}

export function expectErrorShape(
  body: Record<string, unknown>,
  statusCode: number,
  error: string,
  path: string,
): void {
  expect(Object.keys(body).sort()).toEqual([
    'error',
    'message',
    'path',
    'statusCode',
    'timestamp',
  ]);

  expect(body).toMatchObject({
    statusCode,
    error,
    path,
  });

  expect(typeof body.message).toBe('string');
  expect(typeof body.timestamp).toBe('string');
}
