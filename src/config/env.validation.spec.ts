import { envValidationSchema } from './env.validation';

describe('Environment validation', () => {
  const validEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
    DB_NAME: 'test_database',
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ARGON2_MEMORY_COST: '8192',
    ARGON2_TIME_COST: '1',
    ARGON2_PARALLELISM: '1',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  it('accepts a valid startup configuration', () => {
    const { error } = envValidationSchema.validate(validEnv);

    expect(error).toBeUndefined();
  });

  it('rejects startup configuration when a required variable is missing', () => {
    const invalidEnv = { ...validEnv };
    delete invalidEnv.DB_PASSWORD;

    const { error } = envValidationSchema.validate(invalidEnv);

    expect(error).toBeDefined();
    expect(error?.message).toContain('DB_PASSWORD');
  });

  it('rejects startup configuration when PORT is not valid', () => {
    const invalidEnv = {
      ...validEnv,
      PORT: 'abc',
    };

    const { error } = envValidationSchema.validate(invalidEnv);

    expect(error).toBeDefined();
    expect(error?.message).toContain('PORT');
  });
});
