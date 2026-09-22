import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Comment } from '../entities/Comment';
import { Project } from '../entities/Project';
import { ProjectMember } from '../entities/ProjectMember';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Comment,
      Project,
      ProjectMember,
      Task,
      User,
    ]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, RolesGuard],
  exports: [CommentsService],
})
export class CommentsModule {}
