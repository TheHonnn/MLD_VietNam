import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminDatabase } from './admin.database';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminDatabase, AdminGuard, AdminService],
})
export class AdminModule {}
