/**
 * SPM (Sepinud Portfolio Management) — shared domain types.
 *
 * These mirror the shapes the KSS.Service.SPM backend will return, so that when
 * the real service exists only `spm-api.ts` changes — no page or component does.
 *
 * Conventions kept deliberately aligned with the backend contract:
 *  - every id is a GUID string produced by the BACKEND (v7). The UI never invents one.
 *  - lookup values are small codes (the DB owns their int ids); the UI works with codes.
 *  - all timestamps are ISO-8601 UTC strings.
 *  - money is a number of IRR rials; unit counts may be fractional.
 */

export type Guid = string;
export type IsoDateTime = string;

/* ── lookups ──────────────────────────────────────────────────────────────── */

export type RequestType = 'Deposit' | 'Withdrawal';

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Validated'
  | 'AwaitingPayment'
  | 'Paid'
  | 'OrderPlaced'
  | 'PartiallyFilled'
  | 'Filled'
  | 'Settled'
  | 'Rejected'
  | 'Failed'
  | 'Cancelled';

export type PaymentStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Refunded';

export type OrderSide = 'Buy' | 'Sell';

export type OrderStatus =
  | 'Pending'
  | 'AwaitingResponse'
  | 'Partial'
  | 'Executed'
  | 'Cancelled'
  | 'Failed';

export type SettlementStatus =
  | 'PendingSale'
  | 'SaleExecuted'
  | 'PendingSettlement'
  | 'Settled'
  | 'Delayed'
  | 'Failed'
  | 'Reversed';

/** Exactly the four types the reconciliation engine may raise. */
export type DiscrepancyType =
  | 'MissingInOms'
  | 'MissingInBank'
  | 'AmountMismatch'
  | 'StatusMismatch';

export type DiscrepancyStatus = 'Open' | 'Investigating' | 'Resolved' | 'WrittenOff';

export type CaseStatus = 'Open' | 'Assigned' | 'Waiting' | 'Resolved' | 'Closed';

export type LedgerDirection = 'Debit' | 'Credit';

export type LedgerFlowType =
  | 'DepositIn'
  | 'UnitsPurchased'
  | 'UnitsSold'
  | 'WithdrawalOut'
  | 'Fee'
  | 'Adjustment';

export type SourceType =
  | 'Request'
  | 'Order'
  | 'Settlement'
  | 'Payment'
  | 'Discrepancy'
  | 'Adjustment';

export type ExternalServiceType = 'Oms' | 'PaymentGateway' | 'Bank' | 'Sms' | 'Email';

/** `Manual` = no adapter configured yet; the operator performs this step by hand. */
export type ExternalServiceState = 'Healthy' | 'Degraded' | 'Down' | 'Manual';

export type AuditAction = 'Created' | 'Updated' | 'Deleted' | 'StatusChanged' | 'Approved' | 'Rejected';

/* ── business entities ────────────────────────────────────────────────────── */

export interface Instrument {
  id: Guid;
  symbol: string;
  nameFa: string;
  nameEn: string;
  instrumentType: string;
  isActive: boolean;
  navPerUnit: number;
  /**
   * NAV at which units are issued — صدور. Sits beside `navPerUnit` rather than
   * replacing it: `navPerUnit` is the fund's single published unit value, while
   * these two are the prices an investor actually transacts at, and the spread
   * between them is the fund's issuance margin. `Holding` already carries the
   * same pair for a position; this is the catalogue-level twin.
   */
  navIssue: number;
  /** NAV at which units are redeemed — ابطال. */
  navRedeem: number;
  rule: InstrumentRule;
  /** Fund-detail content — everything below is descriptive, not transactional. */
  profile: InstrumentProfile;
}

/**
 * The prose and figures the investor-facing fund page renders, kept in its own
 * interface so the transactional half of `Instrument` stays readable.
 *
 * Every human-readable field is a fa/en pair, matching `nameFa`/`nameEn`: this
 * is marketing and regulatory copy, and it has to translate. Percentages are
 * stored as plain numbers (33.2 means 33.2%), never as pre-formatted strings —
 * formatting is the page's job.
 */
export interface InstrumentProfile {
  /** سود موثر سالانه — effective annual yield, e.g. 33.2 for 33.2%. */
  annualYieldPct: number;
  /** بازدهی یکماه گذشته — trailing one-month return. */
  monthlyReturnPct: number;
  /** بازدهی یکسال گذشته — trailing one-year return. */
  yearlyReturnPct: number;
  /** تاریخ تقسیم سود — when profit is distributed, as prose ('۳۱ هرماه'). */
  profitDistributionFa: string;
  profitDistributionEn: string;
  /** The hero line. Carries the yield inline, so it is copy, not a template. */
  headlineFa: string;
  headlineEn: string;
  aboutFa: string;
  aboutEn: string;
  /** شماره ثبت نزد سازمان بورس. */
  registrationNumber: string;
  /** ضامن نقدشوندگی. */
  guarantorNameFa: string;
  guarantorNameEn: string;
  /** مدیر صندوق. */
  managerNameFa: string;
  managerNameEn: string;
  /** متولی. */
  custodianNameFa: string;
  custodianNameEn: string;
  /** روزهای کاری صندوق. */
  workingDaysFa: string;
  workingDaysEn: string;
  /** The fund's own public site. Empty string when it has none. */
  websiteUrl: string;
  /**
   * An optional promoted feature — «برداشت آنی» on the reference page. Renders
   * nothing when `titleFa` is empty, so a fund without one costs no layout.
   */
  highlight: InstrumentHighlight;
  faq: InstrumentFaq[];
}

export interface InstrumentHighlight {
  titleFa: string;
  titleEn: string;
  bodyFa: string;
  bodyEn: string;
  /** The pulled-out callout line beneath the body. */
  calloutFa: string;
  calloutEn: string;
}

export interface InstrumentFaq {
  questionFa: string;
  questionEn: string;
  answerFa: string;
  answerEn: string;
}

export interface InstrumentRule {
  minAmount: number;
  maxAmount: number;
  minUnits: number;
  /** HH:mm local — orders after this roll to the next trading day. */
  cutOffTime: string;
  /** T+n settlement. */
  settlementDays: number;
  effectiveFrom: IsoDateTime;
  effectiveTo: IsoDateTime | null;
}

export interface InvestorAccount {
  id: Guid;
  /** Reference into the Person service. No cross-database FK. */
  personId: Guid;
  fullNameFa: string;
  fullNameEn: string;
  nationalId: string;
  brokerageAccountCode: string | null;
  iban: string | null;
  accountHolderName: string;
  isActive: boolean;
  openedAt: IsoDateTime;
  totalUnits: number;
  balance: number;
}

export interface InvestmentRequest {
  id: Guid;
  requestNumber: string;
  requestType: RequestType;
  status: RequestStatus;
  investorAccountId: Guid;
  instrumentId: Guid;
  amount: number;
  units: number | null;
  submittedAt: IsoDateTime;
  cutOffAt: IsoDateTime | null;
  needsManualReview: boolean;
  /** Server-derived de-duplication token. Never generated in the browser. */
  idempotencyKey: string;
}

/**
 * What one investor holds in one fund, valued at the current NAV.
 *
 * `InvestorAccount` carries only a portfolio total; the investor portal needs
 * the per-fund breakdown to render fund cards and the composition chart. The
 * real service derives this from the ledger rather than storing it.
 */
export interface Holding {
  investorAccountId: Guid;
  instrumentId: Guid;
  units: number;
  /** units × navRedeem, in rials. */
  value: number;
  /** NAV at which units are issued — صدور. */
  navIssue: number;
  /** NAV at which units are redeemed — ابطال. */
  navRedeem: number;
  asOf: IsoDateTime;
}

/** A profit payment made to an investor for one fund — تقسیم سود. */
export interface ProfitDistribution {
  id: Guid;
  investorAccountId: Guid;
  instrumentId: Guid;
  amount: number;
  distributedAt: IsoDateTime;
}

export interface PaymentTransaction {
  id: Guid;
  requestId: Guid;
  status: PaymentStatus;
  amount: number;
  gatewayReference: string | null;
  rrn: string | null;
  paidAt: IsoDateTime | null;
}

export interface InvestmentOrder {
  id: Guid;
  requestId: Guid;
  instrumentId: Guid;
  side: OrderSide;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price: number | null;
  omsOrderRef: string | null;
  failureReason: string | null;
  placedAt: IsoDateTime | null;
  lastPolledAt: IsoDateTime | null;
}

/** Append-only. The replayable trace behind the settlement state machine. */
export interface OrderEvent {
  id: Guid;
  orderId: Guid;
  action: string;
  detail: string;
  occurredAt: IsoDateTime;
  actor: string;
}

export interface Settlement {
  id: Guid;
  requestId: Guid;
  status: SettlementStatus;
  tradeDate: IsoDateTime;
  settlementDueDate: IsoDateTime;
  grossAmount: number;
  feeAmount: number;
  netPayable: number;
  paidAt: IsoDateTime | null;
  failureReason: string | null;
}

/** Append-only, single-entry with a running balance. */
export interface LedgerEntry {
  id: Guid;
  investorAccountId: Guid;
  sourceType: SourceType;
  sourceId: Guid;
  flowType: LedgerFlowType;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  valueDate: IsoDateTime;
  description: string;
}

export interface ReconciliationRun {
  id: Guid;
  runDate: IsoDateTime;
  startedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  internalCount: number;
  omsCount: number;
  bankCount: number;
  matchedCount: number;
  discrepancyCount: number;
  status: 'Running' | 'Completed' | 'Failed';
}

export interface Discrepancy {
  id: Guid;
  reconciliationRunId: Guid;
  discrepancyType: DiscrepancyType;
  status: DiscrepancyStatus;
  requestId: Guid | null;
  orderId: Guid | null;
  internalAmount: number | null;
  externalAmount: number | null;
  externalRef: string | null;
  assignedTo: string | null;
  detectedAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
}

/** Two-level approval is required above the configured amount threshold. */
export interface ManualAdjustment {
  id: Guid;
  discrepancyId: Guid;
  amount: number;
  reason: string;
  requestedBy: string;
  requestedAt: IsoDateTime;
  firstApprover: string | null;
  firstApprovedAt: IsoDateTime | null;
  secondApprover: string | null;
  secondApprovedAt: IsoDateTime | null;
  status: 'PendingFirst' | 'PendingSecond' | 'Approved' | 'Rejected';
}

export interface ResolutionCase {
  id: Guid;
  caseNumber: string;
  status: CaseStatus;
  sourceType: SourceType;
  sourceId: Guid;
  title: string;
  assignedTo: string | null;
  openedAt: IsoDateTime;
  /** The 2-business-hour manual-review clock. */
  dueAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  notes: ResolutionCaseNote[];
}

export interface ResolutionCaseNote {
  id: Guid;
  actor: string;
  text: string;
  occurredAt: IsoDateTime;
}

/** Append-only. Must carry BOTH before and after state. */
export interface AuditEntry {
  id: Guid;
  entityName: string;
  entityId: Guid;
  action: AuditAction;
  actor: string;
  occurredAt: IsoDateTime;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface ExternalServiceHealth {
  service: ExternalServiceType;
  state: ExternalServiceState;
  lastCheckedAt: IsoDateTime;
  latencyMs: number | null;
  successRate24h: number | null;
  note: string;
}

/* ── request-detail composite (the timeline screen) ───────────────────────── */

export interface RequestTimelineStage {
  key: string;
  label: string;
  state: 'done' | 'current' | 'pending' | 'failed' | 'skipped';
  occurredAt: IsoDateTime | null;
  actor: string | null;
  detail: string | null;
}

export interface RequestDetail {
  request: InvestmentRequest;
  account: InvestorAccount;
  instrument: Instrument;
  payment: PaymentTransaction | null;
  order: InvestmentOrder | null;
  orderEvents: OrderEvent[];
  settlement: Settlement | null;
  ledger: LedgerEntry[];
  timeline: RequestTimelineStage[];
}
