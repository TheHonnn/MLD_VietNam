import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:medical_healthcare_app/features/admin/data/models/admin_models.dart';
import 'package:medical_healthcare_app/features/admin/data/repositories/admin_repository.dart';
import 'package:medical_healthcare_app/features/admin/presentation/screens/admin_frontdesk_screen.dart';
import 'package:medical_healthcare_app/features/admin/presentation/widgets/package_form_sheet.dart';
import 'package:medical_healthcare_app/features/treatment/data/models/treatment_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 3: Monthly Shifts & 10 Sessions = 10 Shifts', () {
    test('AdminTechnicianShiftModel parses shift slots and null fields safely', () {
      final morning = AdminTechnicianShiftModel.fromJson({
        'id': 'sh-1',
        'technician_id': 'tech-1',
        'branch_id': 'br-1',
        'shift_date': '2026-11-18',
        'start_time': '08:30:00',
        'end_time': '12:00:00',
        'technicians': {'full_name': 'Nguyễn Minh KTV'},
        'branches': {'name': 'Cơ sở Quận 1'},
        'branch_rooms': {'name': 'Phòng 102'},
      });

      final afternoon = AdminTechnicianShiftModel.fromJson({
        'id': 'sh-2',
        'technician_id': 'tech-2',
        'branch_id': 'br-1',
        'shift_date': '2026-11-18',
        'start_time': '14:00:00',
        'end_time': '17:30:00',
      });

      final evening = AdminTechnicianShiftModel.fromJson({
        'id': 'sh-3',
        'technician_id': 'tech-3',
        'branch_id': 'br-1',
        'shift_date': '2026-11-18',
        'start_time': '18:00:00',
        'end_time': '21:00:00',
      });

      expect(morning.startTime, '08:30');
      expect(morning.shiftSlot, 'morning');
      expect(morning.shiftLabel, 'Ca Sáng');
      expect(morning.technicianName, 'Nguyễn Minh KTV');

      expect(afternoon.shiftSlot, 'afternoon');
      expect(afternoon.shiftLabel, 'Ca Chiều');

      expect(evening.shiftSlot, 'evening');
      expect(evening.shiftLabel, 'Ca Tối');
    });

    test('AdminBookingModel and AdminRepository extract package id and advance 10 buổi = 10 ca', () {
      const pkgUuid = '11111111-2222-3333-4444-555555555555';
      final booking = AdminBookingModel.fromJson({
        'id': 'bk-100',
        'booking_code': 'BK-PKG-01',
        'booking_date': '2026-11-18',
        'start_time': '09:30:00',
        'end_time': '10:30:00',
        'status': 'IN_SERVICE',
        'payment_status': 'PAID',
        'special_notes': '[Gói liệu trình: Chăm sóc toàn diện | user_package_id=$pkgUuid]',
      });

      expect(booking.isPackageSession, isTrue);
      expect(AdminRepository.extractUserPackageId(booking.notes), pkgUuid);
      expect(AdminRepository.extractUserPackageId('Ghi chú thường'), isNull);

      final firstStep = AdminRepository.computeNextPackageProgress(
        totalSessions: 10,
        completedSessions: 0,
      );
      expect(firstStep.completedSessions, 1);
      expect(firstStep.status, 'ACTIVE');

      final finalStep = AdminRepository.computeNextPackageProgress(
        totalSessions: 10,
        completedSessions: 9,
      );
      expect(finalStep.completedSessions, 10);
      expect(finalStep.status, 'COMPLETED');
    });

    test('UserPackageModel exposes 1 buổi = 1 ca equivalence', () {
      const pkg = UserPackageModel(
        id: 'up-10',
        packageCode: 'PKG-10',
        packageName: 'Liệu trình 10 ca chuyên sâu',
        totalSessions: 10,
        completedSessions: 3,
        status: PackageStatus.active,
        expiryDate: '31/12/2026',
        specialistName: 'BS. Lan',
        branchName: 'Quận 1',
        price: 12000000,
      );

      expect(pkg.totalShifts, 10);
      expect(pkg.completedShifts, 3);
      expect(pkg.remainingShifts, 7);
      expect(pkg.sessionsToShiftsLabel, '10 buổi (10 ca)');
    });

    testWidgets('PackageFormSheet displays buổi (= ca) equivalence labels and chips', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PackageFormSheet(
              onSaved: () {},
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Số buổi (= số ca) *'), findsOneWidget);
      expect(find.text('10 buổi (10 ca)'), findsOneWidget);
    });

    testWidgets('AdminFrontdeskScreen switches to Ca theo tháng calendar view', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: AdminFrontdeskScreen(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Ca theo ngày'), findsOneWidget);
      expect(find.text('Ca theo tháng'), findsOneWidget);

      await tester.tap(find.text('Ca theo tháng'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      final expectedMonth = DateFormat('MM / yyyy').format(DateTime.now());
      expect(find.text('Tháng $expectedMonth'), findsOneWidget);
      expect(find.text('T2'), findsOneWidget);
      expect(find.text('CN'), findsOneWidget);
    });
  });
}
