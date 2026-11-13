import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AdminDatabase } from './admin.database';
import { syncInventoryItem } from './treatment-inventory';

@Injectable()
export class TreatmentInventoryWorker {
  private running = false;
  private readonly logger = new Logger(TreatmentInventoryWorker.name);
  constructor(
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
  ) {}
  @Interval(15000)
  async process() {
    if (
      this.running ||
      !(
        this.config.get('ADMIN_DATABASE_URL') || this.config.get('DATABASE_URL')
      )
    )
      return;
    this.running = true;
    try {
      const rows = (
        await this.db.connection.query(
          "SELECT id FROM treatment_inventory_outbox WHERE sync_status IN ('PENDING_SYNC','FAILED') ORDER BY CASE WHEN sync_status='PENDING_SYNC' THEN 0 ELSE 1 END,created_at,id LIMIT 25",
        )
      ).rows;
      for (const row of rows)
        await syncInventoryItem(this.db.connection, row.id);
    } catch (error) {
      this.logger.warn(
        'Không xử lý được hàng đợi tồn kho; cần kiểm tra schema/kết nối.',
      );
    } finally {
      this.running = false;
    }
  }
}
