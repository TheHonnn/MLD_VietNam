import { ServiceMaterial, InventoryConsumptionLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

export const inventoryService = {
  async getServiceMaterials(serviceId?: string): Promise<ApiResponse<ServiceMaterial[]>> {
    try {
      let queryPath = 'service_materials?select=*,service:services!service_id(name)&order=created_at.asc';
      if (serviceId) queryPath += `&service_id=eq.${serviceId}`;

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Định mức vật tư', data: [] };

      const list: ServiceMaterial[] = raw.map((m) => ({
        id: m.id,
        serviceId: m.service_id,
        materialName: m.material_name,
        dosagePerSession: Number(m.dosage_per_session),
        unit: m.unit,
        notes: m.notes,
        serviceName: m.service?.name || 'Dịch vụ MLD',
      }));

      return { success: true, statusCode: 200, message: 'Tải định mức vật tư thành công', data: list };
    } catch (err) {
      console.error('[inventoryService] getServiceMaterials error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải định mức vật tư', data: [] };
    }
  },

  async addServiceMaterial(data: {
    serviceId: string;
    materialName: string;
    dosagePerSession: number;
    unit: string;
    notes?: string;
  }): Promise<ApiResponse<ServiceMaterial | null>> {
    try {
      const payload = {
        service_id: data.serviceId,
        material_name: data.materialName,
        dosage_per_session: data.dosagePerSession,
        unit: data.unit,
        notes: data.notes || '',
      };
      const res = await supabaseService.query<any[]>('service_materials', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res || res.length === 0) return { success: false, statusCode: 400, message: 'Không thể thêm định mức', data: null };

      return {
        success: true,
        statusCode: 201,
        message: 'Đã bổ sung định mức vật tư thành công',
        data: {
          id: res[0].id,
          serviceId: res[0].service_id,
          materialName: res[0].material_name,
          dosagePerSession: Number(res[0].dosage_per_session),
          unit: res[0].unit,
          notes: res[0].notes,
        },
      };
    } catch (err) {
      console.error('[inventoryService] addServiceMaterial error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi thêm định mức vật tư', data: null };
    }
  },

  async getConsumptionLogs(params?: {
    branchId?: string;
    serviceId?: string;
    bookingId?: string;
  }): Promise<ApiResponse<InventoryConsumptionLog[]>> {
    try {
      let queryPath = 'inventory_consumption_logs?select=*,service:services!service_id(name),branch:branches!branch_id(name),tech:users!technician_id(full_name)&order=logged_at.desc';
      if (params?.branchId) queryPath += `&branch_id=eq.${params.branchId}`;
      if (params?.serviceId) queryPath += `&service_id=eq.${params.serviceId}`;
      if (params?.bookingId) queryPath += `&booking_id=eq.${params.bookingId}`;

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Nhật ký tiêu hao', data: [] };

      const list: InventoryConsumptionLog[] = raw.map((l) => ({
        id: l.id,
        branchId: l.branch_id,
        serviceId: l.service_id,
        bookingId: l.booking_id,
        invoiceId: l.invoice_id,
        technicianId: l.technician_id,
        materialName: l.material_name,
        quantityDeducted: Number(l.quantity_deducted),
        unit: l.unit,
        loggedAt: l.logged_at,
        serviceName: l.service?.name || 'Dịch vụ MLD',
        branchName: l.branch?.name || 'Chi nhánh',
        technicianName: l.tech?.full_name || 'Kỹ thuật viên',
      }));

      return { success: true, statusCode: 200, message: 'Tải nhật ký tiêu hao vật tư thành công', data: list };
    } catch (err) {
      console.error('[inventoryService] getConsumptionLogs error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải nhật ký tiêu hao', data: [] };
    }
  },

  async deductMaterialsForBooking(params: {
    bookingId: string;
    serviceId: string;
    branchId: string;
    technicianId?: string | null;
  }): Promise<ApiResponse<number>> {
    try {
      // 1. Tìm định mức tiêu hao của dịch vụ
      const materialsRes = await this.getServiceMaterials(params.serviceId);
      if (!materialsRes.success || !materialsRes.data || materialsRes.data.length === 0) {
        return { success: true, statusCode: 200, message: 'Dịch vụ không có định mức vật tư tiêu hao', data: 0 };
      }

      let count = 0;
      for (const mat of materialsRes.data) {
        const payload = {
          branch_id: params.branchId,
          service_id: params.serviceId,
          booking_id: params.bookingId,
          technician_id: params.technicianId || null,
          material_name: mat.materialName,
          quantity_deducted: mat.dosagePerSession,
          unit: mat.unit,
        };
        await supabaseService.query<any[]>('inventory_consumption_logs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        count++;
      }

      return {
        success: true,
        statusCode: 201,
        message: `Đã tự động trừ kho ${count} loại vật tư theo định mức BOM`,
        data: count,
      };
    } catch (err) {
      console.error('[inventoryService] deductMaterialsForBooking error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi trừ kho nguyên vật liệu', data: 0 };
    }
  },
};
