import { adminApi } from '../admin/api';
import type { ActionCenterSummary } from '../pages/action-center.rules';

const EMPTY_ACTION_CENTER: ActionCenterSummary = {
  totalCount: 0,
  counts: {
    overdueBookings: 0,
    pendingTickets: 0,
    failedInventoryOutbox: 0,
    pendingEnrollmentApprovals: 0,
    draftCertificates: 0,
  },
  items: [],
};

export const actionCenterService = {
  async getSummary(branchId?: string, signal?: AbortSignal): Promise<ActionCenterSummary> {
    const params = new URLSearchParams();
    if (branchId && branchId !== 'ALL') {
      params.set('branchId', branchId);
    }
    const query = params.toString();
    const res = await adminApi<Partial<ActionCenterSummary>>(
      'action-center' + (query ? `?${query}` : ''),
      undefined,
      signal,
    );
    const counts = {
      overdueBookings: Number(res?.counts?.overdueBookings || 0),
      pendingTickets: Number(res?.counts?.pendingTickets || 0),
      failedInventoryOutbox: Number(res?.counts?.failedInventoryOutbox || 0),
      pendingEnrollmentApprovals: Number(res?.counts?.pendingEnrollmentApprovals || 0),
      draftCertificates: Number(res?.counts?.draftCertificates || 0),
    };
    const totalCount =
      Number(res?.totalCount ?? (
        counts.overdueBookings +
        counts.pendingTickets +
        counts.failedInventoryOutbox +
        counts.pendingEnrollmentApprovals +
        counts.draftCertificates
      ));
    return {
      totalCount,
      counts,
      items: Array.isArray(res?.items) ? res.items : EMPTY_ACTION_CENTER.items,
    };
  },
};
