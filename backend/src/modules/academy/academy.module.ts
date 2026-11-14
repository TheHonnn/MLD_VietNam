import { Module } from '@nestjs/common';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';
import { DatabaseModule } from '../../database/database.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [DatabaseModule, AdminModule],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}

