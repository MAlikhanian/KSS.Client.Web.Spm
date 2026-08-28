/**
 * SPM — display helpers shared by every screen in the section.
 * Formatting only: no data access, no business rules.
 */

import type {
  DiscrepancyStatus,
  DiscrepancyType,
  ExternalServiceState,
  OrderStatus,
  RequestStatus,
  SettlementStatus,
} from './types';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'destructive' | 'warning';

/**
 * Rials, grouped. Amounts in this domain are large, so a compact form is offered
 * for tiles while tables keep the exact figure.
 */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
}

export function formatAmountCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString('en-US');
}

export function formatUnits(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/**
 * Fixed UTC formatting. Deliberately not locale/timezone dependent — a value
 * that renders differently on the server and in the browser causes a hydration
 * mismatch, and every timestamp in this domain is stored UTC.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** Whole hours between two ISO instants; negative means overdue. */
export function hoursUntil(iso: string, nowIso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(nowIso)) / 36e5);
}

/* ── status → badge variant ───────────────────────────────────────────────── */

export const REQUEST_STATUS_VARIANT: Record<RequestStatus, BadgeVariant> = {
  Draft: 'secondary',
  Submitted: 'secondary',
  Validated: 'primary',
  AwaitingPayment: 'warning',
  Paid: 'primary',
  OrderPlaced: 'primary',
  PartiallyFilled: 'warning',
  Filled: 'success',
  Settled: 'success',
  Rejected: 'destructive',
  Failed: 'destructive',
  Cancelled: 'secondary',
};

export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  Pending: 'secondary',
  AwaitingResponse: 'warning',
  Partial: 'warning',
  Executed: 'success',
  Cancelled: 'secondary',
  Failed: 'destructive',
};

export const SETTLEMENT_STATUS_VARIANT: Record<SettlementStatus, BadgeVariant> = {
  PendingSale: 'secondary',
  SaleExecuted: 'primary',
  PendingSettlement: 'primary',
  Settled: 'success',
  Delayed: 'warning',
  Failed: 'destructive',
  Reversed: 'destructive',
};

export const DISCREPANCY_STATUS_VARIANT: Record<DiscrepancyStatus, BadgeVariant> = {
  Open: 'destructive',
  Investigating: 'warning',
  Resolved: 'success',
  WrittenOff: 'secondary',
};

export const DISCREPANCY_TYPE_LABEL: Record<DiscrepancyType, string> = {
  MissingInOms: 'Missing in OMS',
  MissingInBank: 'Missing in bank',
  AmountMismatch: 'Amount mismatch',
  StatusMismatch: 'Status mismatch',
};

export const HEALTH_STATE_VARIANT: Record<ExternalServiceState, BadgeVariant> = {
  Healthy: 'success',
  Degraded: 'warning',
  Down: 'destructive',
  Manual: 'secondary',
};

/** Percentage filled, clamped, for partial-fill progress bars. */
export function fillPercent(filled: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
}
