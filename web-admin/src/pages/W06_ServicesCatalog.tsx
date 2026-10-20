import React from 'react';
import { ModulePlaceholder } from './ModulePlaceholder';

export const W06_ServicesCatalog: React.FC = () => {
  return (
    <ModulePlaceholder
      code="W06"
      title="Danh Mục Dịch Vụ Spa & Gói Liệu Trình Combo"
      description="Quản lý danh mục nhóm dịch vụ, bảng giá dịch vụ lẻ, thời lượng thực hiện, quy trình các bước (steps) và cấu hình gói liệu trình trị liệu dài hạn."
      databaseTables={['service_categories', 'services', 'treatment_packages']}
      keyFeatures={[
        'Phân nhóm danh mục dịch vụ: Gội đầu dưỡng sinh, Trị liệu cổ vai gáy, Thư giãn toàn thân, Chăm sóc da chuyên sâu.',
        'Cấu hình chi tiết dịch vụ: Tên, thời lượng (phút), giá niêm yết, giá khuyến mãi, danh sách lợi ích (benefits).',
        'Đặc tả quy trình từng bước của kỹ thuật viên (Steps: step, title, desc) đảm bảo chuẩn hóa dịch vụ trên toàn hệ thống.',
        'Cấu hình gói combo điều trị (TreatmentPackage): Số buổi, thời hạn sử dụng (validityMonths), chiết khấu gói.',
      ]}
      samplePayload={`{
  "name": "Trị Liệu Vai Gáy & Cổ Chuyên Sâu Đá Nóng",
  "durationMinutes": 75,
  "price": 1200000.00,
  "discountPrice": 980000.00,
  "steps": [
    { "step": 1, "title": "Khai thông huyệt đạo", "desc": "Bấm huyệt Phong Trì, Kiên Tỉnh" },
    { "step": 2, "title": "Đi đá nóng bazan", "desc": "Làm ấm cơ và đả thông kinh lạc" }
  ],
  "benefits": ["Giảm đau nhức mỏi cổ", "Cải thiện giấc ngủ", "Lưu thông khí huyết"]
}`}
    />
  );
};
