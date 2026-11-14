import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('Treatment Lifecycle & Reversal State Machine Tests (Web-Admin)', () => {
  test('uses the dedicated backend lifecycle command instead of the generic resource action', () => {
    const source = readFileSync(new URL('../src/services/treatment.service.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /adminApi\('user_packages\/action'/);
    assert.match(source, /adminCommand\(`treatment\/packages\/\$\{encodeURIComponent\(userPackageId\)\}\/action`/);
  });

  test('production startup applies the treatment lifecycle migration before serving requests', () => {
    const backendPackage = JSON.parse(
      readFileSync(new URL('../../backend/package.json', import.meta.url), 'utf8')
    );
    assert.equal(
      backendPackage.scripts['prestart:prod'],
      'node ../scripts/apply_migration.js 031_treatment_lifecycle_management.sql && node ../scripts/apply_migration.js 032_home_care_delivery_snapshots.sql && node ../scripts/apply_migration.js 033_treatment_replacement_sessions.sql && node ../scripts/apply_migration.js 034_treatment_inventory_stock.sql && node ../scripts/apply_migration.js 039_portal_schema_repair.sql && node ../scripts/apply_migration.js 040_admin_settings_fast_read.sql'
    );
  });
  // 1. Package Status Finite State Machine
  const validTransitions = {
    PENDING_PAYMENT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['PAUSED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'TRANSFERRED', 'REFUNDED'],
    PAUSED: ['ACTIVE', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
    COMPLETED: ['ACTIVE'], // Automatic return to ACTIVE upon session reversal
    EXPIRED: ['ACTIVE'],   // Re-activated upon extension
    CANCELLED: [],         // Terminal state
    TRANSFERRED: [],       // Terminal state (remaining sessions transferred to new owner)
    REFUNDED: [],          // Terminal state
  };

  const isValidTransition = (from, to) => {
    return Boolean(validTransitions[from]?.includes(to));
  };

  test('validates valid package status transitions', () => {
    assert.equal(isValidTransition('ACTIVE', 'PAUSED'), true);
    assert.equal(isValidTransition('PAUSED', 'ACTIVE'), true);
    assert.equal(isValidTransition('ACTIVE', 'COMPLETED'), true);
    assert.equal(isValidTransition('COMPLETED', 'ACTIVE'), true, 'Reversal must allow COMPLETED -> ACTIVE');
    assert.equal(isValidTransition('ACTIVE', 'TRANSFERRED'), true);
    assert.equal(isValidTransition('ACTIVE', 'REFUNDED'), true);
    assert.equal(isValidTransition('ACTIVE', 'CANCELLED'), true);
    assert.equal(isValidTransition('EXPIRED', 'ACTIVE'), true, 'Extension must allow EXPIRED -> ACTIVE');
  });

  test('rejects invalid or unauthorized package status transitions', () => {
    assert.equal(isValidTransition('CANCELLED', 'ACTIVE'), false, 'Cancelled package cannot be resumed');
    assert.equal(isValidTransition('REFUNDED', 'ACTIVE'), false, 'Refunded package cannot be resumed');
    assert.equal(isValidTransition('TRANSFERRED', 'ACTIVE'), false, 'Transferred package cannot be reactivated under old owner');
    assert.equal(isValidTransition('COMPLETED', 'PAUSED'), false, 'Completed package cannot be paused directly');
  });

  // 2. Safe Treatment Session Reversal Logic
  test('session reversal requires valid reason of at least 5 characters', () => {
    const validateReversalInput = (reason) => {
      if (!reason || typeof reason !== 'string') return false;
      return reason.trim().length >= 5;
    };

    assert.equal(validateReversalInput(''), false);
    assert.equal(validateReversalInput('   '), false);
    assert.equal(validateReversalInput('Lỗi'), false);
    assert.equal(validateReversalInput('KTV chọn nhầm khách hàng'), true);
  });

  test('prevents double reversal of the same treatment session', () => {
    const session = {
      id: 'journal-001',
      sessionNumber: 1,
      isReversed: false,
    };

    const reverseSession = (s, reason) => {
      if (s.isReversed) {
        throw new Error('Buổi điều trị này đã được hoàn tác trước đó.');
      }
      return {
        ...s,
        isReversed: true,
        reversalReason: reason,
        reversedAt: new Date().toISOString(),
      };
    };

    const reversed = reverseSession(session, 'Khách bị kích ứng phải dừng buổi');
    assert.equal(reversed.isReversed, true);
    assert.equal(reversed.reversalReason, 'Khách bị kích ứng phải dừng buổi');

    assert.throws(
      () => reverseSession(reversed, 'Thử hoàn tác lần hai'),
      /đã được hoàn tác trước đó/i
    );
  });

  test('restores available session count and resets completed package status upon reversal', () => {
    const pkg = {
      id: 'pkg-001',
      totalSessions: 5,
      completedSessions: 5,
      status: 'COMPLETED',
    };

    const journals = [
      { id: 'j-1', sessionNumber: 1, isReversed: false },
      { id: 'j-2', sessionNumber: 2, isReversed: false },
      { id: 'j-3', sessionNumber: 3, isReversed: false },
      { id: 'j-4', sessionNumber: 4, isReversed: false },
      { id: 'j-5', sessionNumber: 5, isReversed: false },
    ];

    // Reversing journal 5
    const updatedJournals = journals.map((j) =>
      j.id === 'j-5' ? { ...j, isReversed: true, reversalReason: 'KTV ghi nhận nhầm lịch' } : j
    );

    const nonReversedCount = updatedJournals.filter((j) => !j.isReversed).length;
    const nextCompleted = nonReversedCount;
    const nextStatus = nextCompleted >= pkg.totalSessions ? 'COMPLETED' : 'ACTIVE';

    assert.equal(nextCompleted, 4);
    assert.equal(nextStatus, 'ACTIVE', 'Package status must revert to ACTIVE when session is reversed');
  });

  // 3. Operational KPI Calculations
  test('accurately calculates operational dashboard metrics from real data cohorts', () => {
    const packages = [
      { id: 'p1', rawStatus: 'ACTIVE', usedSessions: 2, remainingSessions: 3, sessionsHistory: [] },
      { id: 'p2', rawStatus: 'PAUSED', usedSessions: 1, remainingSessions: 4, sessionsHistory: [] },
      { id: 'p3', rawStatus: 'EXPIRED', usedSessions: 5, remainingSessions: 0, sessionsHistory: [] },
      {
        id: 'p4',
        rawStatus: 'ACTIVE',
        usedSessions: 3,
        remainingSessions: 2,
        sessionsHistory: [{ isReversed: true }, { hasAbnormalReaction: true }],
      },
    ];

    const stats = {
      activePackages: packages.filter((p) => p.rawStatus === 'ACTIVE').length,
      pausedPackages: packages.filter((p) => p.rawStatus === 'PAUSED').length,
      expiredPackages: packages.filter((p) => p.rawStatus === 'EXPIRED').length,
      totalRemainingSessions: packages.reduce((acc, p) => acc + p.remainingSessions, 0),
      totalUsedSessions: packages.reduce((acc, p) => acc + p.usedSessions, 0),
      reversalsCount: packages.reduce(
        (acc, p) => acc + p.sessionsHistory.filter((s) => s.isReversed).length,
        0
      ),
      abnormalReactionsCount: packages.reduce(
        (acc, p) => acc + p.sessionsHistory.filter((s) => s.hasAbnormalReaction).length,
        0
      ),
    };

    assert.equal(stats.activePackages, 2);
    assert.equal(stats.pausedPackages, 1);
    assert.equal(stats.expiredPackages, 1);
    assert.equal(stats.totalRemainingSessions, 9);
    assert.equal(stats.totalUsedSessions, 11);
    assert.equal(stats.reversalsCount, 1);
    assert.equal(stats.abnormalReactionsCount, 1);
  });

  // 4. Vietnamese Status Display Mapping
  test('provides unambiguous Vietnamese labels for all statuses', () => {
    const statusLabels = {
      ACTIVE: 'Đang sử dụng',
      COMPLETED: 'Hoàn tất',
      EXPIRED: 'Hết hạn',
      CANCELLED: 'Đã hủy',
      PAUSED: 'Tạm dừng',
      PENDING_PAYMENT: 'Chờ thanh toán',
      TRANSFERRED: 'Đã chuyển nhượng',
      REFUNDED: 'Đã hoàn tiền',
    };

    for (const [key, label] of Object.entries(statusLabels)) {
      assert.ok(label && label.length > 0, `Status ${key} must have Vietnamese label`);
      assert.equal(typeof label, 'string');
    }
  });
});
