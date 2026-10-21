import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

