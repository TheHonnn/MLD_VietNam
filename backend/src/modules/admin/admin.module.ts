import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminDatabase } from './admin.database';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { TreatmentInventoryWorker } from './treatment-inventory.worker';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [AdminController],
  providers: [AdminDatabase, AdminGuard, AdminService, TreatmentInventoryWorker],
})
export class AdminModule {}
