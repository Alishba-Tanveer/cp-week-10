import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import {
  expectErrorShape,
  registerAndLogin,
} from './integration.helpers';
import { resetTestDatabase } from './test-db';

describe('Assignment 1 - Integration tests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get<DataSource>(getDataSourceToken());
  });

  afterEach(async () => {
    await resetTestDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('C1 creates a project and reads it back through HTTP', async () => {
    const { accessToken, user } = await registerAndLogin(app, {
      name: 'C1 User',
      email: 'c1-user@example.com',
    });

    const createResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'C1 Integration Project',
        ownerId: user.id,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: expect.any(Number),
      name: 'C1 Integration Project',
      owner: expect.objectContaining({
        id: user.id,
        email: user.email,
      }),
    });

    const projectId = createResponse.body.id;

    const readResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(200);

    expect(readResponse.body).toMatchObject({
      id: projectId,
      name: 'C1 Integration Project',
      owner: expect.objectContaining({
        id: user.id,
        email: user.email,
      }),
    });
  });

  it('C2 returns 400 for an invalid project body', async () => {
    const { accessToken } = await registerAndLogin(app, {
      name: 'Invalid Body User',
      email: 'invalid-body-user@example.com',
    });

    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'x',
      })
      .expect(400);

    expectErrorShape(
      response.body,
      400,
      'Bad Request',
      '/projects',
    );
  });

  it('C2 returns 401 for a project write without a token', async () => {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .send({
        name: 'Unauthenticated Project',
        ownerId: 1,
      })
      .expect(401);

    expectErrorShape(
      response.body,
      401,
      'Unauthorized',
      '/projects',
    );
  });

  it('C3 returns 404 when reading a valid-format nonexistent project', async () => {
    const response = await request(app.getHttpServer())
      .get('/projects/999999')
      .expect(404);

    expectErrorShape(
      response.body,
      404,
      'Not Found',
      '/projects/999999',
    );

    expect(response.body.message).toBe('Project not found');
  });

  it('C3 returns 404 when updating a valid-format nonexistent project', async () => {
    const { accessToken } = await registerAndLogin(app, {
      name: 'C3 Update User',
      email: 'c3-update-user@example.com',
    });

    const response = await request(app.getHttpServer())
      .patch('/projects/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Should Not Exist',
      })
      .expect(404);

    expectErrorShape(
      response.body,
      404,
      'Not Found',
      '/projects/999999',
    );

    expect(response.body.message).toBe('Project not found');
  });

  it('C3 returns 404 when deleting a valid-format nonexistent project', async () => {
    const { accessToken } = await registerAndLogin(app, {
      name: 'C3 Delete User',
      email: 'c3-delete-user@example.com',
    });

    const response = await request(app.getHttpServer())
      .delete('/projects/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expectErrorShape(
      response.body,
      404,
      'Not Found',
      '/projects/999999',
    );

    expect(response.body.message).toBe('Project not found');
  });

  it('C4 does not depend on data created by another test', async () => {
    const response = await request(app.getHttpServer()).get('/projects');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('X1 applies status and projectId filters with AND semantics', async () => {
    const { accessToken, user } = await registerAndLogin(app, {
      name: 'X1 User',
      email: 'x1-user@example.com',
    });

    const projectOne = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'X1 Project One',
        ownerId: user.id,
      })
      .expect(201);

    const projectTwo = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'X1 Project Two',
        ownerId: user.id,
      })
      .expect(201);

    const projectOneId = projectOne.body.id;
    const projectTwoId = projectTwo.body.id;

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'X1 Match',
        description: 'Matches both filters',
        status: 'todo',
        projectId: projectOneId,
        priority: 3,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'X1 Wrong Status',
        description: 'Matches project but not status',
        status: 'done',
        projectId: projectOneId,
        priority: 3,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'X1 Wrong Project',
        description: 'Matches status but not project',
        status: 'todo',
        projectId: projectTwoId,
        priority: 3,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/tasks')
      .query({
        status: 'todo',
        projectId: projectOneId,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      title: 'X1 Match',
      status: 'todo',
      projectId: projectOneId,
    });

    expect(
      response.body.items.some(
        (task: { title: string }) => task.title === 'X1 Wrong Status',
      ),
    ).toBe(false);

    expect(
      response.body.items.some(
        (task: { title: string }) => task.title === 'X1 Wrong Project',
      ),
    ).toBe(false);
  });

  it('X2 rejects unknown DTO fields and creates no database row', async () => {
    const { accessToken, user } = await registerAndLogin(app, {
      name: 'X2 User',
      email: 'x2-user@example.com',
    });

    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Unknown Field Project',
        ownerId: user.id,
        unexpectedField: 'must be rejected',
      })
      .expect(400);

    expectErrorShape(
      response.body,
      400,
      'Bad Request',
      '/projects',
    );

    const projects = await dataSource.query(
      'SELECT * FROM "projects" WHERE "name" = $1',
      ['Unknown Field Project'],
    );

    expect(projects).toHaveLength(0);
  });
});
