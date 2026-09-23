import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { Project } from '../entities/Project';
import { Tag } from '../entities/Tag';
import { Task, TaskStatus } from '../entities/Task';
import { User } from '../entities/User';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  const taskRepository = {
    create: jest.fn<(task: Partial<Task>) => Task>(),
    save: jest.fn<(task: Task) => Promise<Task>>(),
    findOne: jest.fn<() => Promise<Task | null>>(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn<(task: Task) => Promise<Task>>(),
  };

  const projectRepository = {
    findOne: jest.fn<() => Promise<Project | null>>(),
  };

  const userRepository = {
    findOne: jest.fn<() => Promise<User | null>>(),
  };

  const tagRepository = {
    findBy: jest.fn<() => Promise<Tag[]>>(),
  };

  const getRawAndEntities = jest.fn<
    () => Promise<{
      entities: Task[];
      raw: Array<{ task_commentCount?: string }>;
    }>
  >();

  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn<() => Promise<[Task[], number]>>(),
    getRawAndEntities,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);

    taskRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue:
            taskRepository as unknown as Partial<Repository<Task>>,
        },
        {
          provide: getRepositoryToken(Project),
          useValue:
            projectRepository as unknown as Partial<Repository<Project>>,
        },
        {
          provide: getRepositoryToken(User),
          useValue:
            userRepository as unknown as Partial<Repository<User>>,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue:
            tagRepository as unknown as Partial<Repository<Tag>>,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a task for an existing project', async () => {
    const project = {
      id: 10,
      name: 'Project 10',
    } as Project;

    const createdTask = {
      id: 1,
      title: 'Created task',
      projectId: 10,
      creatorId: 5,
    } as unknown as Task;

    projectRepository.findOne.mockResolvedValue(project);
    taskRepository.create.mockReturnValue(createdTask);
    taskRepository.save.mockResolvedValue(createdTask);

    const result = await service.create(
      {
        title: 'Created task',
        description: 'Task description',
        status: TaskStatus.TODO,
        priority: 3,
        projectId: 10,
      },
      5,
    );

    expect(projectRepository.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
    });

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Created task',
        description: 'Task description',
        status: TaskStatus.TODO,
        priority: 3,
        project,
        projectId: 10,
        creatorId: 5,
        assignee: null,
        assigneeId: null,
        tags: [],
      }),
    );

    expect(taskRepository.save).toHaveBeenCalledWith(createdTask);
    expect(result).toBe(createdTask);
  });

  it('creates a task with an assignee and tags', async () => {
    const project = {
      id: 10,
      name: 'Project 10',
    } as Project;

    const assignee = {
      id: 7,
      name: 'Assignee',
    } as User;

    const tags = [
      { id: 1, name: 'backend' },
      { id: 2, name: 'urgent' },
    ] as Tag[];

    const createdTask = {
      id: 2,
      title: 'Assigned task',
      projectId: 10,
      creatorId: 5,
      assigneeId: 7,
      tags,
    } as unknown as Task;

    projectRepository.findOne.mockResolvedValue(project);
    userRepository.findOne.mockResolvedValue(assignee);
    tagRepository.findBy.mockResolvedValue(tags);
    taskRepository.create.mockReturnValue(createdTask);
    taskRepository.save.mockResolvedValue(createdTask);

    const result = await service.create(
      {
        title: 'Assigned task',
        description: undefined,
        status: TaskStatus.IN_PROGRESS,
        priority: 4,
        projectId: 10,
        assigneeId: 7,
        tagIds: [1, 2],
      },
      5,
    );

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
    });

    expect(tagRepository.findBy).toHaveBeenCalledWith({
      id: expect.anything(),
    });

    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Assigned task',
        description: null,
        status: TaskStatus.IN_PROGRESS,
        priority: 4,
        project,
        projectId: 10,
        creatorId: 5,
        assignee,
        assigneeId: 7,
        tags,
      }),
    );

    expect(result).toBe(createdTask);
  });

  it('throws when creating a task for a missing project', async () => {
    projectRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          title: 'Missing project task',
          projectId: 999,
          priority: 3,
          status: TaskStatus.TODO,
        },
        5,
      ),
    ).rejects.toThrow('Project with id 999 not found');

    expect(taskRepository.create).not.toHaveBeenCalled();
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('throws when the assignee does not exist', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 10,
    } as Project);

    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          title: 'Assigned task',
          projectId: 10,
          priority: 3,
          status: TaskStatus.TODO,
          assigneeId: 99,
        },
        5,
      ),
    ).rejects.toThrow('User with id 99 not found');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 99 },
    });

    expect(taskRepository.create).not.toHaveBeenCalled();
  });

  it('throws when a requested tag does not exist', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 10,
    } as Project);

    tagRepository.findBy.mockResolvedValue([
      { id: 1, name: 'existing' },
    ] as Tag[]);

    await expect(
      service.create(
        {
          title: 'Tagged task',
          projectId: 10,
          priority: 3,
          status: TaskStatus.TODO,
          tagIds: [1, 2],
        },
        5,
      ),
    ).rejects.toThrow('Tag with id 2 not found');

    expect(tagRepository.findBy).toHaveBeenCalled();
    expect(taskRepository.create).not.toHaveBeenCalled();
  });

  it('finds a task by id with its comment count', async () => {
    const task = {
      id: 1,
      title: 'Test task',
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '3' }],
    });

    const result = await service.findById(1);

    expect(taskRepository.createQueryBuilder).toHaveBeenCalledWith(
      'task',
    );

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
      1,
      'task.project',
      'project',
    );

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
      2,
      'task.assignee',
      'assignee',
    );

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
      3,
      'task.tags',
      'tags',
    );

    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.any(Function),
      'task_commentCount',
    );

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'task.id = :id',
      { id: 1 },
    );

    expect(getRawAndEntities).toHaveBeenCalled();

    expect(result).toBe(task);
    expect(result.commentCount).toBe(3);
  });

  it('defaults comment count to zero when the database returns no count', async () => {
    const task = {
      id: 2,
      title: 'No comments',
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [],
    });

    const result = await service.findById(2);

    expect(result.commentCount).toBe(0);
  });

  it('throws when the task does not exist', async () => {
    getRawAndEntities.mockResolvedValue({
      entities: [],
      raw: [],
    });

    await expect(service.findById(999)).rejects.toThrow(
      'Task with id 999 not found',
    );

    expect(getRawAndEntities).toHaveBeenCalled();
  });

  it('returns paginated tasks with filters', async () => {
    const tasks = [
      { id: 1, title: 'Task 1' },
      { id: 2, title: 'Task 2' },
    ] as unknown as Task[];

    queryBuilder.getManyAndCount.mockResolvedValue([tasks, 5]);

    const result = await service.findAll({
      status: TaskStatus.IN_PROGRESS,
      projectId: 10,
      assigneeId: 7,
      page: 2,
      pageSize: 2,
    });

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(3);

    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'task.status = :status',
      { status: TaskStatus.IN_PROGRESS },
    );

    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'task.projectId = :projectId',
      { projectId: 10 },
    );

    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      3,
      'task.assigneeId = :assigneeId',
      { assigneeId: 7 },
    );

    expect(queryBuilder.skip).toHaveBeenCalledWith(2);
    expect(queryBuilder.take).toHaveBeenCalledWith(2);

    expect(result).toEqual({
      items: tasks,
      total: 5,
      page: 2,
      pageSize: 2,
    });
  });

  it('uses default pagination when filters are omitted', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({});

    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('caps page size at 100', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({
      page: 3,
      pageSize: 500,
    });

    expect(queryBuilder.skip).toHaveBeenCalledWith(200);
    expect(queryBuilder.take).toHaveBeenCalledWith(100);

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(100);
  });

  it('updates a task with all supported fields', async () => {
    const task = {
      id: 1,
      title: 'Old title',
      description: 'Old description',
      status: TaskStatus.TODO,
      priority: 1,
      assignee: null,
      assigneeId: null,
      tags: [],
    } as unknown as Task;

    const assignee = {
      id: 7,
      name: 'Assignee',
    } as User;

    const tags = [
      { id: 1, name: 'backend' },
      { id: 2, name: 'urgent' },
    ] as Tag[];

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '0' }],
    });

    userRepository.findOne.mockResolvedValue(assignee);
    tagRepository.findBy.mockResolvedValue(tags);
    taskRepository.save.mockResolvedValue(task);

    const result = await service.update(1, {
      assigneeId: 7,
      tagIds: [1, 2],
      title: 'New title',
      description: 'New description',
      status: TaskStatus.DONE,
      priority: 5,
    });

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
    });

    expect(tagRepository.findBy).toHaveBeenCalled();

    expect(task.title).toBe('New title');
    expect(task.description).toBe('New description');
    expect(task.status).toBe(TaskStatus.DONE);
    expect(task.priority).toBe(5);
    expect(task.assignee).toBe(assignee);
    expect(task.assigneeId).toBe(7);
    expect(task.tags).toBe(tags);

    expect(taskRepository.save).toHaveBeenCalledWith(task);
    expect(result).toBe(task);
  });

  it('updates only supplied task fields', async () => {
    const task = {
      id: 1,
      title: 'Existing title',
      description: 'Existing description',
      status: TaskStatus.TODO,
      priority: 2,
      assignee: null,
      assigneeId: null,
      tags: [],
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '0' }],
    });

    taskRepository.save.mockResolvedValue(task);

    const result = await service.update(1, {
      title: 'Updated title',
    });

    expect(task.title).toBe('Updated title');
    expect(task.description).toBe('Existing description');
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.priority).toBe(2);
    expect(taskRepository.save).toHaveBeenCalledWith(task);
    expect(result).toBe(task);
  });

  it('preserves the existing title when title is omitted', async () => {
    const task = {
      id: 1,
      title: 'Existing title',
      description: 'Existing description',
      status: TaskStatus.TODO,
      priority: 2,
      assignee: null,
      assigneeId: null,
      tags: [],
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '0' }],
    });

    taskRepository.save.mockResolvedValue(task);

    const result = await service.update(1, {
      description: 'Updated description',
    });

    expect(task.title).toBe('Existing title');
    expect(task.description).toBe('Updated description');
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.priority).toBe(2);
    expect(taskRepository.save).toHaveBeenCalledWith(task);
    expect(result).toBe(task);
  });

  it('throws when updating a missing task', async () => {
    getRawAndEntities.mockResolvedValue({
      entities: [],
      raw: [],
    });

    await expect(
      service.update(999, {
        title: 'New title',
      }),
    ).rejects.toThrow('Task with id 999 not found');

    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('throws when updating with a missing assignee', async () => {
    const task = {
      id: 1,
      title: 'Task',
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '0' }],
    });

    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(1, {
        assigneeId: 99,
      }),
    ).rejects.toThrow('User with id 99 not found');

    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('throws when updating with a missing tag', async () => {
    const task = {
      id: 1,
      title: 'Task',
    } as unknown as Task;

    getRawAndEntities.mockResolvedValue({
      entities: [task],
      raw: [{ task_commentCount: '0' }],
    });

    tagRepository.findBy.mockResolvedValue([
      { id: 1, name: 'existing' },
    ] as Tag[]);

    await expect(
      service.update(1, {
        tagIds: [1, 2],
      }),
    ).rejects.toThrow('Tag with id 2 not found');

    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('removes an existing task', async () => {
    const task = {
      id: 1,
      title: 'Task to remove',
    } as unknown as Task;

    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.remove.mockResolvedValue(task);

    await expect(service.remove(1)).resolves.toBeUndefined();

    expect(taskRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(taskRepository.remove).toHaveBeenCalledWith(task);
  });

  it('throws when removing a missing task', async () => {
    taskRepository.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(
      'Task with id 999 not found',
    );

    expect(taskRepository.remove).not.toHaveBeenCalled();
  });
});
