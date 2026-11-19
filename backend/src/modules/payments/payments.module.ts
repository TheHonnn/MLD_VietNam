import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayAdapter],
  exports: [PaymentsService, PaymentGatewayAdapter],
})
export class PaymentsModule {}
