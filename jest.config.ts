import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'ES2023',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          isolatedModules: true,
          strict: true,
          skipLibCheck: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/auth/auth.service.ts',
    'src/comments/comments.service.ts',
    'src/projects/projects.service.ts',
    'src/tasks/tasks.service.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
    },
  },
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
