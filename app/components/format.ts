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
 * Dates render in the CALENDAR OF THE ACTIVE LANGUAGE: Jalali (شمسی) under fa,
 * Gregorian under en. Every SPM screen — console and investor portal — goes
 * through here, so the two can never disagree about what day it is.
 *
 * WHY THIS CHANGED, and why the original reasoning no longer applies:
 * these functions used to return `iso.slice(0, 10)` — a fixed Gregorian string,
 * chosen because a value that renders differently on the server and in the
 * browser causes a hydration mismatch. That was correct then. It is not a risk
 * now: every screen in this zone is a client component that loads its data in
 * `useEffect`, so no date is rendered during the server pass at all. The cost
 * was a Persian UI showing 2026-08-21 to a Persian user.
 *
 * `toLocaleDateString` under `fa-IR` gives the Persian calendar with Persian
 * digits — ۱۴۰۵/۰۵/۳۰ — which is what the client's own panels show.
 */

import i18n from 'i18next';

/** Map the active i18n language onto a full locale tag. */
function activeLocale(): string {
  const lang = (i18n?.language ?? 'fa').toLowerCase();
  return lang.startsWith('fa') ? 'fa-IR' : 'en-US';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(activeLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString(activeLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatDate(iso)} ${time}`;
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
