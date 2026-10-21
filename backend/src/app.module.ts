import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as path from 'path';
import * as fs from 'fs';
import { I18nModule, HeaderResolver, AcceptLanguageResolver } from 'nestjs-i18n';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { SpecialitiesModule } from './modules/specialities/specialities.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { MembershipModule } from './modules/membership/membership.module';
import { AcademyModule } from './modules/academy/academy.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        path: fs.existsSync(path.join(__dirname, 'i18n'))
          ? path.join(__dirname, 'i18n')
          : path.join(process.cwd(), 'src', 'i18n'),
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['accept-language']),
        AcceptLanguageResolver,
      ],
    }),
    DatabaseModule,
    AuthModule,
    SpecialitiesModule,
    DoctorsModule,
    AppointmentsModule,
    TreatmentModule,
    MembershipModule,
    AdminModule,
    AcademyModule,
    TasksModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
