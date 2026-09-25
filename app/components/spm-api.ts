/**
 * SPM — data access for the section.
 *
 * ► THIS IS THE ONLY FILE THAT KNOWS THE DATA IS FAKE. ◄
 *
 * Every page and component in `app/(protected)/spm/**` imports from here and
 * nowhere else. Each function is async and returns the shape the KSS.Service.SPM
 * endpoint will return, so wiring the real backend later means replacing the
 * body of each function with a fetch and deleting `mock-data.ts`. No page, no
 * component and no type has to change.
 *
 * When the backend lands, each body becomes roughly:
 *
 *   const res = await fetch(`/api/spm/requests?${qs}`, { cache: 'no-store' });
 *   if (!res.ok) throw new Error(await res.text());
 *   return res.json();
 *
 * NOTE: no id is ever generated here. The backend supplies GUID v7 ids.
 */

import { formatDate } from './format';
import {
  MOCK_ACCOUNTS,
  MOCK_ADJUSTMENTS,
  MOCK_AUDIT,
  MOCK_CASES,
  MOCK_DISCREPANCIES,
  MOCK_HEALTH,
  MOCK_HOLDINGS,
  MOCK_INSTRUMENTS,
  MOCK_LEDGER,
  MOCK_ORDERS,
  MOCK_ORDER_EVENTS,
  MOCK_PAYMENTS,
  MOCK_PROFIT_DISTRIBUTIONS,
  MOCK_RECON_RUNS,
  MOCK_SETTLEMENTS,
} from './mock-data';
import {
  addRequest,
  findRequest,
  listRequests,
  setRequestStatus,
  type CreateRequestInput,
  type CreateRequestResult,
} from './mock-store';
import type {
  AuditEntry,
  Discrepancy,
  ExternalServiceHealth,
  Guid,
  Holding,
  Instrument,
  InvestmentOrder,
  InvestmentRequest,
  InvestorAccount,
  LedgerEntry,
  ManualAdjustment,
  ProfitDistribution,
  ReconciliationRun,
  RequestDetail,
  RequestStatus,
  RequestTimelineStage,
  ResolutionCase,
  Settlement,
} from './types';

/** Re-exported so screens never import from the mock layer directly. */
export type { CreateRequestInput, CreateRequestResult };

/** Simulated network latency so loading states are real during development. */
const LATENCY_MS = 220;

function respond<T>(data: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(data)), LATENCY_MS),
  );
}

/* ── instruments ──────────────────────────────────────────────────────────── */

export function getInstruments(): Promise<Instrument[]> {
  return respond(MOCK_INSTRUMENTS);
}

export function getInstrument(id: Guid): Promise<Instrument | null> {
  return respond(MOCK_INSTRUMENTS.find((i) => i.id === id) ?? null);
}

/* ── accounts ─────────────────────────────────────────────────────────────── */

export function getAccounts(): Promise<InvestorAccount[]> {
  return respond(MOCK_ACCOUNTS);
}

export function getAccount(id: Guid): Promise<InvestorAccount | null> {
  return respond(MOCK_ACCOUNTS.find((a) => a.id === id) ?? null);
}

/* ── holdings & profit — the investor portal's own reads ──────────────────── */

/** One investor's per-fund holdings. `GET /api/spm/accounts/{id}/holdings`. */
export function getHoldings(accountId: Guid): Promise<Holding[]> {
  return respond(MOCK_HOLDINGS.filter((h) => h.investorAccountId === accountId));
}

/** Profit paid to one investor — تقسیم سود, newest first. */
export function getProfitDistributions(accountId: Guid): Promise<ProfitDistribution[]> {
  return respond(
    MOCK_PROFIT_DISTRIBUTIONS.filter((p) => p.investorAccountId === accountId).sort((a, b) =>
      b.distributedAt.localeCompare(a.distributedAt),
    ),
  );
}

/** One investor's ledger, oldest first — drives the asset-history chart. */
export function getLedgerForAccount(accountId: Guid): Promise<LedgerEntry[]> {
  return respond(
    MOCK_LEDGER.filter((l) => l.investorAccountId === accountId).sort((a, b) =>
      a.valueDate.localeCompare(b.valueDate),
    ),
  );
}

/** One investor's requests, newest first. */
export function getRequestsForAccount(accountId: Guid): Promise<InvestmentRequest[]> {
  return respond(
    listRequests()
      .filter((r) => r.investorAccountId === accountId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
  );
}

/* ── requests ─────────────────────────────────────────────────────────────── */

export function getRequests(): Promise<InvestmentRequest[]> {
  return respond(
    [...listRequests()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
  );
}

/**
 * Registers a capital deposit or withdrawal request — proposal §7-1 and §7-2.
 *
 * On the real backend this is `POST /api/spm/requests`, and the response is the
 * created row. Idempotent per §13-5: submitting the same request twice returns
 * the first one and creates nothing, which `deduplicated` reports so the UI can
 * say so rather than silently pretending it created something.
 */
export function createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  return respond(addRequest(input));
}

/**
 * Advances a request through the settlement state machine — proposal §13-1.
 * On the real backend this is `PATCH /api/spm/requests/{id}/status`, which
 * validates the transition server-side and appends to the audit trail.
 */
export function advanceRequestStatus(
  id: Guid,
  status: RequestStatus,
): Promise<InvestmentRequest | null> {
  setRequestStatus(id, status);
  return respond(findRequest(id) ?? null);
}

/**
 * The request timeline screen. On the real backend this is one composite
 * endpoint (`GET /api/spm/requests/{id}`) rather than five round-trips.
 */
export function getRequestDetail(id: Guid): Promise<RequestDetail | null> {
  const request = findRequest(id);
  if (!request) return respond(null);

  const account = MOCK_ACCOUNTS.find((a) => a.id === request.investorAccountId)!;
  const instrument = MOCK_INSTRUMENTS.find((i) => i.id === request.instrumentId)!;
  const payment = MOCK_PAYMENTS.find((p) => p.requestId === id) ?? null;
  const order = MOCK_ORDERS.find((o) => o.requestId === id) ?? null;
  const settlement = MOCK_SETTLEMENTS.find((s) => s.requestId === id) ?? null;
  const orderEvents = order
    ? MOCK_ORDER_EVENTS.filter((e) => e.orderId === order.id).sort((a, b) =>
        a.occurredAt.localeCompare(b.occurredAt),
      )
    : [];
  const ledger = MOCK_LEDGER.filter((l) => l.sourceId === id).sort((a, b) =>
    a.valueDate.localeCompare(b.valueDate),
  );

  return respond({
    request,
    account,
    instrument,
    payment,
    order,
    orderEvents,
    settlement,
    ledger,
    timeline: buildTimeline(request, payment, order, settlement),
  });
}

/**
 * Derives the six-stage progress model from whatever rows exist.
 * The real service computes this server-side from the settlement state machine;
 * deriving it here keeps the component identical either way.
 */
function buildTimeline(
  request: InvestmentRequest,
  payment: { status: string; paidAt: string | null } | null,
  order: InvestmentOrder | null,
  settlement: Settlement | null,
): RequestTimelineStage[] {
  const terminalBad = ['Rejected', 'Cancelled', 'Failed'].includes(request.status);

  const stages: RequestTimelineStage[] = [
    {
      key: 'submitted',
      label: 'Submitted',
      state: 'done',
      occurredAt: request.submittedAt,
      actor: 'investor',
      detail: request.requestNumber,
    },
    {
      key: 'validated',
      label: 'Validated',
      state: request.status === 'Draft' || request.status === 'Submitted' ? 'pending' : 'done',
      occurredAt: request.status === 'Draft' || request.status === 'Submitted' ? null : request.submittedAt,
      actor: 'system',
      detail: 'Instrument rules and limits checked',
    },
    {
      key: 'payment',
      label: request.requestType === 'Deposit' ? 'Payment' : 'Sale proceeds',
      state: !payment
        ? 'pending'
        : payment.status === 'Succeeded'
          ? 'done'
          : payment.status === 'Failed'
            ? 'failed'
            : 'current',
      occurredAt: payment?.paidAt ?? null,
      actor: 'gateway',
      detail: payment ? `Status: ${payment.status}` : 'Awaiting payment',
    },
    {
      key: 'order',
      label: 'Order',
      state: !order
        ? 'pending'
        : order.status === 'Executed'
          ? 'done'
          : order.status === 'Failed'
            ? 'failed'
            : order.status === 'Cancelled'
              ? 'skipped'
              : 'current',
      occurredAt: order?.placedAt ?? null,
      actor: 'OMS',
      detail: order
        ? `${order.side} ${order.filledQuantity.toLocaleString()} / ${order.quantity.toLocaleString()} units`
        : 'Not placed',
    },
    {
      key: 'settlement',
      label: 'Settlement',
      state: !settlement
        ? 'pending'
        : settlement.status === 'Settled'
          ? 'done'
          : settlement.status === 'Failed'
            ? 'failed'
            : settlement.status === 'Delayed'
              ? 'failed'
              : 'current',
      occurredAt: settlement?.paidAt ?? null,
      actor: 'bank',
      detail: settlement ? `Due ${formatDate(settlement.settlementDueDate)}` : 'Not scheduled',
    },
    {
      key: 'complete',
      label: terminalBad ? 'Closed' : 'Complete',
      state: request.status === 'Settled' ? 'done' : terminalBad ? 'failed' : 'pending',
      occurredAt: settlement?.paidAt ?? null,
      actor: null,
      detail: terminalBad ? `Ended as ${request.status}` : null,
    },
  ];

  return stages;
}

/* ── orders ───────────────────────────────────────────────────────────────── */

export function getOrders(): Promise<InvestmentOrder[]> {
  return respond(
    [...MOCK_ORDERS].sort((a, b) => (b.placedAt ?? '').localeCompare(a.placedAt ?? '')),
  );
}

/* ── settlements ──────────────────────────────────────────────────────────── */

export function getSettlements(): Promise<Settlement[]> {
  return respond(
    [...MOCK_SETTLEMENTS].sort((a, b) =>
      a.settlementDueDate.localeCompare(b.settlementDueDate),
    ),
  );
}

/* ── ledger ───────────────────────────────────────────────────────────────── */

export function getLedger(accountId?: Guid): Promise<LedgerEntry[]> {
  const rows = accountId
    ? MOCK_LEDGER.filter((l) => l.investorAccountId === accountId)
    : MOCK_LEDGER;
  return respond([...rows].sort((a, b) => a.valueDate.localeCompare(b.valueDate)));
}

/* ── reconciliation ───────────────────────────────────────────────────────── */

export function getReconciliationRuns(): Promise<ReconciliationRun[]> {
  return respond([...MOCK_RECON_RUNS].sort((a, b) => b.runDate.localeCompare(a.runDate)));
}

export function getDiscrepancies(runId?: Guid): Promise<Discrepancy[]> {
  const rows = runId
    ? MOCK_DISCREPANCIES.filter((d) => d.reconciliationRunId === runId)
    : MOCK_DISCREPANCIES;
  return respond([...rows].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)));
}

/* ── adjustments ──────────────────────────────────────────────────────────── */

export function getAdjustments(): Promise<ManualAdjustment[]> {
  return respond(
    [...MOCK_ADJUSTMENTS].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
  );
}

/* ── resolution ───────────────────────────────────────────────────────────── */

export function getCases(): Promise<ResolutionCase[]> {
  return respond([...MOCK_CASES].sort((a, b) => b.openedAt.localeCompare(a.openedAt)));
}

export function getCase(id: Guid): Promise<ResolutionCase | null> {
  return respond(MOCK_CASES.find((c) => c.id === id) ?? null);
}

/* ── audit ────────────────────────────────────────────────────────────────── */

export function getAuditEntries(): Promise<AuditEntry[]> {
  return respond([...MOCK_AUDIT].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
}

/* ── health ───────────────────────────────────────────────────────────────── */

export function getServiceHealth(): Promise<ExternalServiceHealth[]> {
  return respond(MOCK_HEALTH);
}

/* ── cross-screen lookup helpers ──────────────────────────────────────────── */

/** Small maps the list screens use to render names instead of raw ids. */
export async function getLookupMaps(): Promise<{
  accounts: Record<Guid, InvestorAccount>;
  instruments: Record<Guid, Instrument>;
  requests: Record<Guid, InvestmentRequest>;
}> {
  const [accounts, instruments, requests] = await Promise.all([
    getAccounts(),
    getInstruments(),
    getRequests(),
  ]);
  return {
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a])),
    instruments: Object.fromEntries(instruments.map((i) => [i.id, i])),
    requests: Object.fromEntries(requests.map((r) => [r.id, r])),
  };
}
