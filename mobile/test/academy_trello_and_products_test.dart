import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/services/data/models/home_product_model.dart';

void main() {
  group('AdminKpiMetrics Tests', () {
    test('AdminKpiMetrics supports todayStudentsCount and monthStudentsCount', () {
      final metrics = AdminKpiMetrics(
        todayRevenue: 15000000,
        monthRevenue: 180000000,
        todayStudentsCount: 4,
        monthStudentsCount: 42,
        todayBookingsCount: 12,
        waitingBatchStudentsCount: 3,
        pendingActionsCount: 2,
      );

      expect(metrics.todayRevenue, 15000000);
      expect(metrics.monthRevenue, 180000000);
      expect(metrics.todayStudentsCount, 4);
      expect(metrics.monthStudentsCount, 42);
      expect(metrics.todayBookingsCount, 12);
      expect(metrics.waitingBatchStudentsCount, 3);
      expect(metrics.pendingActionsCount, 2);
    });
  });

  group('HomeProductModel Tests', () {
    test('HomeProductModel maps Supabase JSON correctly', () {
      final json = {
        'id': 'prod-001',
        'name': 'Băng ép đa lớp MLD Pro Care',
        'category': 'Băng ép',
        'price_min': 350000,
        'price_max': 500000,
        'unit': 'Cuộn',
        'details': 'Sợi cotton dệt đàn hồi cao, đạt chuẩn y khoa trị liệu phù bạch huyết.',
        'sort_order': 1,
        'image_url': 'https://example.com/bandage.png',
      };

      final product = HomeProductModel.fromJson(json);

      expect(product.id, 'prod-001');
      expect(product.name, 'Băng ép đa lớp MLD Pro Care');
      expect(product.category, 'Băng ép');
      expect(product.priceMin, 350000);
      expect(product.priceMax, 500000);
      expect(product.unit, 'Cuộn');
      expect(product.details.any((d) => d.contains('chuẩn y khoa')), isTrue);
      expect(product.sortOrder, 1);
      expect(product.imageUrl, 'https://example.com/bandage.png');
      expect(product.formattedPrice, contains('350.000'));
    });

    test('HomeProductModel handles null and single price gracefully', () {
      final json = {
        'id': 'prod-002',
        'name': 'Dầu massage MLD Lavender',
        'price_min': 200000,
        'price_max': 200000,
      };

      final product = HomeProductModel.fromJson(json);

      expect(product.id, 'prod-002');
      expect(product.category, 'Dụng cụ tập luyện');
      expect(product.unit, 'chiếc');
      expect(product.formattedPrice, '200.000 ₫');
    });
  });

  group('Admin Academy Models Tests', () {
    test('AdminCourseBatchModel handles courseTitle and enrollments', () {
      final batch = AdminCourseBatchModel(
        id: 'batch-01',
        courseId: 'c-01',
        courseTitle: 'Kỹ thuật viên MLD Chuyên nghiệp K15',
        batchCode: 'MLD-K15',
        startDate: '2026-11-15',
        endDate: '2026-12-15',
        scheduleDays: 'T2-T4-T6',
        timeSlot: '08:30 - 11:30',
        status: 'OPEN_FOR_ENROLLMENT',
        maxStudents: 20,
        enrolledCount: 12,
      );

      expect(batch.courseTitle, 'Kỹ thuật viên MLD Chuyên nghiệp K15');
      expect(batch.batchCode, 'MLD-K15');
      expect(batch.enrolledCount, 12);
    });

    test('AdminCandidateModel parses JSON correctly', () {
      final json = {
        'id': 'cand-101',
        'order_code': 'ENR-999',
        'student_name': 'Nguyễn Thị Hương',
        'student_phone': '0901234567',
        'student_email': 'huong.nguyen@example.com',
        'course_id': 'c-01',
        'batch_id': 'batch-01',
        'status': 'ENROLLED_STUDYING',
        'tuition_total': 15000000,
        'amount_paid': 15000000,
        'created_at': '2026-11-09T08:00:00Z',
        'notes': 'Đã hoàn tất học phí đợt 1',
        'courses': {'title': 'Khóa MLD Cơ bản'},
        'course_batches': {'batch_code': 'K15'},
      };

      final candidate = AdminCandidateModel.fromJson(json);

      expect(candidate.id, 'cand-101');
      expect(candidate.candidateName, 'Nguyễn Thị Hương');
      expect(candidate.status, 'ENROLLED_STUDYING');
      expect(candidate.courseTitle, 'Khóa MLD Cơ bản');
      expect(candidate.batchCode, 'K15');
    });
  });
}
