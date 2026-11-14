import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminDatabase } from './admin.database';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { TreatmentInventoryWorker } from './treatment-inventory.worker';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [AdminController, SettingsController],
  providers: [AdminDatabase, AdminGuard, AdminService, TreatmentInventoryWorker, SettingsService],
  exports: [SettingsService],
})
})
export class AdminModule {}
