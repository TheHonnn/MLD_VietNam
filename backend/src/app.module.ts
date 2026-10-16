import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { SpecialitiesModule } from './modules/specialities/specialities.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { MembershipModule } from './modules/membership/membership.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    SpecialitiesModule,
    DoctorsModule,
    AppointmentsModule,
    TreatmentModule,
    MembershipModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
