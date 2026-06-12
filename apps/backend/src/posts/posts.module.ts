import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { ProjectsController } from './projects.controller';

@Module({ controllers: [PostsController, ProjectsController] })
export class PostsModule {}
