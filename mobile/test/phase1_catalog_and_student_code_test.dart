import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/academy/data/models/academy_models.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/services/data/models/home_product_model.dart';

void main() {
  group('Phase 1: HomeProductModel 3-package grouping', () {
    test('uses explicit treatment_package_group when provided', () {
      final product = HomeProductModel.fromJson({
        'id': 'prod-1',
        'name': 'Kem dưỡng da',
        'category': 'Chăm sóc da',
        'treatment_package_group': 'Chăm sóc toàn diện',
        'price_min': 400000,
        'price_max': 400000,
        'unit': 'Tuýp',
      });

      expect(product.treatmentPackageGroup, 'Chăm sóc toàn diện');
    });

    test('falls back cleanly when treatment_package_group is null', () {
      final expanded = HomeProductModel.fromJson({
        'id': 'prod-2',
        'name': 'Băng ép y khoa',
        'category': 'Băng ép',
        'treatment_package_group': null,
        'price_min': 350000,
        'price_max': 500000,
        'unit': 'Cuộn',
      });
      final comprehensive = HomeProductModel.fromJson({
        'id': 'prod-3',
        'name': 'Bóng tập',
        'category': 'Dụng cụ tập luyện',
        'price_min': 200000,
        'price_max': 200000,
        'unit': 'Chiếc',
      });
      final localized = HomeProductModel.fromJson({
        'id': 'prod-4',
        'name': 'Serum phục hồi',
        'category': 'Chăm sóc da',
        'price_min': 500000,
        'price_max': 500000,
        'unit': 'Chai',
      });

      expect(expanded.treatmentPackageGroup, 'Chăm sóc mở rộng');
      expect(comprehensive.treatmentPackageGroup, 'Chăm sóc toàn diện');
      expect(localized.treatmentPackageGroup, 'Chăm sóc khu trú');
    });
  });

  group('Phase 1: StudentCode separation and null safety', () {
    test('AdminCandidateModel reads student_code and role from nested users', () {
      final candidate = AdminCandidateModel.fromJson({
        'id': 'enr-1',
        'student_id': 'user-1',
        'order_code': 'KH-20261117-001',
        'student_name': 'Nguyễn Văn A',
        'student_phone': '0901234567',
        'course_id': 'course-1',
        'tuition_total': 15000000,
        'amount_paid': 2000000,
        'status': 'ENROLLED',
        'users': {
          'student_code': 'HV26-009',
          'role': 'STUDENT',
        },
      });

      expect(candidate.studentId, 'user-1');
      expect(candidate.studentCode, 'HV26-009');
      expect(candidate.studentRole, 'STUDENT');
      expect(candidate.orderCode, 'KH-20261117-001');
    });

    test('StudentCertificateModel keeps studentCode separate from certificateCode', () {
      final cert = StudentCertificateModel.fromJson({
        'id': 'cert-1',
        'certificate_code': 'MLD-GCN-2026-001',
        'student_code': 'HV26-009',
        'student_name': 'Nguyễn Văn A',
        'course_title': 'Dẫn lưu bạch huyết',
        'issue_date': '2026-11-17',
        'theory_score': 9.0,
        'practical_score': 9.5,
        'final_grade': 'XUẤT SẮC',
        'status': 'ISSUED',
        'signer_name': 'MLD',
        'signer_title': 'Giám đốc',
        'qr_verification_code': 'QR-123',
      });

      expect(cert.studentCode, 'HV26-009');
      expect(cert.certificateCode, 'MLD-GCN-2026-001');
    });
  });
}
