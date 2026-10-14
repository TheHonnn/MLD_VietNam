import { Module } from '@nestjs/common';
import { SpecialitiesService } from './specialities.service';
import { SpecialitiesController } from './specialities.controller';

@Module({
  controllers: [SpecialitiesController],
  providers: [SpecialitiesService],
  exports: [SpecialitiesService],
})
export class SpecialitiesModule {}

