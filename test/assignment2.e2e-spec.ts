import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import { ProjectMember, ProjectMemberRole } from '../src/entities/ProjectMember';

import { resetTestDatabase } from './test-db';

describe('Assignment 2 - End-to-end flow and coverage (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let projectMemberRepository: Repository<ProjectMember>;

  const owner = {
    name: 'Assignment 2 Owner',
    email: `assignment2-owner-${Date.now()}@example.com`,
    password: 'Assignment2Password123!',
  };

  const viewer = {
    name: 'Assignment 2 Viewer',
    email: `assignment2-viewer-${Date.now()}@example.com`,
    password: 'Assignment2Viewer123!',
  };

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

    projectMemberRepository = app.get<Repository<ProjectMember>>(
      getRepositoryToken(ProjectMember),
    );
  });

  afterEach(async () => {
    await resetTestDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes the full project → task → comment journey with refresh and denied branches', async () => {
    // ------------------------------------------------------------
    // W1 — Register and log in
    // ------------------------------------------------------------

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: owner.name,
        email: owner.email,
        password: owner.password,
      })
      .expect(201);

    expect(registerResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: owner.name,
        email: owner.email,
      }),
    );

    const ownerUserId = registerResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: owner.email,
        password: owner.password,
      })
      .expect(200);

    expect(loginResponse.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );

    let accessToken = loginResponse.body.accessToken;
    const originalRefreshToken = loginResponse.body.refreshToken;

    expect(accessToken).toEqual(expect.any(String));
    expect(originalRefreshToken).toEqual(expect.any(String));

    // ------------------------------------------------------------
    // W1 — Create project using access token
    // ------------------------------------------------------------

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Assignment 2 Project ${Date.now()}`,
      })
      .expect(201);

    expect(projectResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        ownerId: ownerUserId,
      }),
    );

    const projectId = projectResponse.body.id;

    expect(projectId).toEqual(expect.any(Number));

    // ------------------------------------------------------------
    // W1 — Create task inside project
    // ------------------------------------------------------------

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `Assignment 2 Task ${Date.now()}`,
        description: 'Assignment 2 E2E task',
        projectId,
        priority: 3,
      })
      .expect(201);

    expect(taskResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: expect.any(String),
        projectId,
      }),
    );

    const taskId = taskResponse.body.id;

    expect(taskId).toEqual(expect.any(Number));

    // ------------------------------------------------------------
    // W2 — Read task and verify FK wiring
    // ------------------------------------------------------------

    const readTaskResponse = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .expect(200);

    expect(readTaskResponse.body).toEqual(
      expect.objectContaining({
        id: taskId,
        projectId,
      }),
    );

    expect(readTaskResponse.body.project).toEqual(
      expect.objectContaining({
        id: projectId,
      }),
    );

    // The test must fail if task → project FK wiring is broken.
    expect(readTaskResponse.body.projectId).toBe(projectId);

    // ------------------------------------------------------------
    // W1 — Add comment to task using same access token
    // ------------------------------------------------------------

    const commentResponse = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        body: 'Assignment 2 integration comment',
      })
      .expect(201);

    expect(commentResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        body: 'Assignment 2 integration comment',
        taskId,
        authorId: ownerUserId,
      }),
    );

    const commentId = commentResponse.body.id;

    expect(commentId).toEqual(expect.any(Number));

    // ------------------------------------------------------------
    // W2 — Read comments and verify FK wiring
    // ------------------------------------------------------------

    const commentsResponse = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/comments`)
      .expect(200);

    expect(commentsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: commentId,
          taskId,
          authorId: ownerUserId,
        }),
      ]),
    );

    const createdComment = commentsResponse.body.items.find(
      (comment: { id: number }) => comment.id === commentId,
    );

    expect(createdComment).toBeDefined();

    // The test must fail if comment → task FK wiring is broken.
    expect(createdComment.taskId).toBe(taskId);

    // ------------------------------------------------------------
    // C1 — Refresh token part-way through the same flow
    // ------------------------------------------------------------

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: originalRefreshToken,
      })
      .expect(200);

    expect(refreshResponse.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );

    const refreshedAccessToken = refreshResponse.body.accessToken;
    const rotatedRefreshToken = refreshResponse.body.refreshToken;

    expect(rotatedRefreshToken).not.toBe(originalRefreshToken);

    // Replace the old access token with the newly refreshed one.
    accessToken = refreshedAccessToken;

    // Verify the refreshed token works on a protected route.
    const protectedWriteResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `Post-refresh Task ${Date.now()}`,
        description: 'Created using refreshed access token',
        projectId,
        priority: 4,
      })
      .expect(201);

    expect(protectedWriteResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        projectId,
      }),
    );

    // ------------------------------------------------------------
    // C2 — Add viewer and verify denied write branch
    // ------------------------------------------------------------

    const viewerRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(viewer)
      .expect(201);

    const viewerUserId = viewerRegisterResponse.body.id;

    expect(viewerUserId).toEqual(expect.any(Number));

    await projectMemberRepository.save(
      projectMemberRepository.create({
        userId: viewerUserId,
        projectId,
        role: ProjectMemberRole.VIEWER,
      }),
    );

    const viewerLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: viewer.email,
        password: viewer.password,
      })
      .expect(200);

    const viewerAccessToken = viewerLoginResponse.body.accessToken;

    expect(viewerAccessToken).toEqual(expect.any(String));

    // Viewer can be a project member, but cannot perform task writes.
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .send({
        title: `Viewer Forbidden Task ${Date.now()}`,
        description: 'This write must be denied',
        projectId,
        priority: 3,
      })
      .expect(403);

    // ------------------------------------------------------------
    // C2 — Logout and reuse the same refresh token
    // ------------------------------------------------------------

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refreshToken: rotatedRefreshToken,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: rotatedRefreshToken,
      })
      .expect(401);

  });
});
