import { Module } from '@nestjs/common';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}

