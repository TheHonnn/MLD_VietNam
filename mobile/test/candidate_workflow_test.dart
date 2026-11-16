import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';

void main() {
  group('Admin Candidate Workflow & Force Move Tests', () {
    test('Unpaid candidate with approvalStatus APPROVED correctly maps to PAID_WAITING_CLASS', () {
      final json = {
        'id': 'enr-unpaid-001',
        'order_code': 'ENR-20261116-099',
        'student_name': 'Nguyen Van A',
        'student_phone': '0901234567',
        'course_id': 'crs-001',
        'course_title': 'Khoa Dao Tao Chuyen Sau',
        'batch_id': null,
        'tuition_total': 9000000,
        'amount_paid': 0,
        'status': 'ENROLLED',
        'approval_status': 'APPROVED',
        'consultation_status': 'CONFIRMED',
      };

      final model = AdminCandidateModel.fromJson(json);

      expect(model.status, 'PAID_WAITING_CLASS');
      expect(model.amountPaid, 0.0);
      expect(model.tuitionTotal, 9000000.0);
      expect(model.batchId, isNull);
    });

    test('Candidate with status GRADUATED correctly maps to COMPLETED', () {
      final json = {
        'id': 'enr-grad-001',
        'order_code': 'ENR-20261116-100',
        'student_name': 'Tran Thi B',
        'student_phone': '0909876543',
        'course_id': 'crs-001',
        'course_title': 'Khoa Dao Tao Chuyen Sau',
        'batch_id': 'batch-001',
        'tuition_total': 9000000,
        'amount_paid': 9000000,
        'status': 'GRADUATED',
        'approval_status': 'APPROVED',
        'consultation_status': 'CONFIRMED',
      };

      final model = AdminCandidateModel.fromJson(json);

      expect(model.status, 'COMPLETED');
    });

    test('Unpaid candidate without approval maps to CONFIRMED_PENDING_PAY', () {
      final json = {
        'id': 'enr-unpaid-002',
        'order_code': 'ENR-20261116-101',
        'student_name': 'Le Van C',
        'student_phone': '0912345678',
        'course_id': 'crs-001',
        'course_title': 'Khoa Dao Tao Chuyen Sau',
        'batch_id': null,
        'tuition_total': 9000000,
        'amount_paid': 0,
        'status': 'DEPOSITED',
        'approval_status': 'PENDING_APPROVAL',
        'consultation_status': 'CONFIRMED',
      };

      final model = AdminCandidateModel.fromJson(json);

      expect(model.status, 'CONFIRMED_PENDING_PAY');
      expect(model.amountPaid, 0.0);
    });
  });
}
