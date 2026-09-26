import 'dotenv/config';
import { DataSource } from 'typeorm';

import { appConfig } from '../config/configuration';
import { Comment } from '../entities/Comment';
import { Project } from '../entities/Project';
import { ProjectMember } from '../entities/ProjectMember';
import { RefreshToken } from '../entities/RefreshToken';
import { Tag } from '../entities/Tag';
import { Task } from '../entities/Task';
import { User } from '../entities/User';

const config = appConfig();

export default new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: [
    User,
    RefreshToken,
    Project,
    ProjectMember,
    Task,
    Tag,
    Comment,
  ],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
