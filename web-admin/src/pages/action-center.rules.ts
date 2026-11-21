export interface ActionCenterCounts {
  overdueBookings: number;
  pendingTickets: number;
  failedInventoryOutbox: number;
  pendingEnrollmentApprovals: number;
  draftCertificates: number;
}

export interface ActionCenterItem {
  id: string;
  category:
    | 'OVERDUE_BOOKING'
    | 'INVENTORY_OUTBOX'
    | 'ENROLLMENT_APPROVAL'
    | 'DRAFT_CERTIFICATE'
    | 'SUPPORT_TICKET';
  badge: string;
  title: string;
  subtitle: string;
  link: string;
}

export interface ActionCenterSummary {
  totalCount: number;
  counts: ActionCenterCounts;
  items: ActionCenterItem[];
}

export function formatBadgeCount(count?: number): string {
  const num = Number(count || 0);
  if (!Number.isFinite(num) || num <= 0) return '';
  return num > 99 ? '99+' : String(Math.floor(num));
}

export function mapActionCountsToSidebarBadges(
  counts: ActionCenterCounts,
): Record<string, number> {
  const totalCount =
    Number(counts.overdueBookings || 0) +
    Number(counts.pendingTickets || 0) +
    Number(counts.failedInventoryOutbox || 0) +
    Number(counts.pendingEnrollmentApprovals || 0) +
    Number(counts.draftCertificates || 0);

  return {
    '/': totalCount,
    '/staff-schedule': Number(counts.overdueBookings || 0),
    '/customers': Number(counts.pendingTickets || 0),
    '/help': Number(counts.pendingTickets || 0),
    '/help?tab=customer-tickets': Number(counts.pendingTickets || 0),
    '/treatment-inventory': Number(counts.failedInventoryOutbox || 0),
    '/medical-records': Number(counts.failedInventoryOutbox || 0),
    '/academy-enrollment': Number(counts.pendingEnrollmentApprovals || 0),
    '/certificates': Number(counts.draftCertificates || 0),
  };
}
