/**
 * SPM — the mutable half of the mock backend.
 *
 * `mock-data.ts` is the seed: fixed rows that never change. This file holds
 * everything the UI creates or changes at runtime, so the operator console and
 * the investor portal see one shared world — an investor submits a request and
 * the operator finds it in the queue.
 *
 * ► THIS FILE AND `mock-data.ts` DIE TOGETHER. ◄
 * When KSS.Service.SPM exists, the bodies in `spm-api.ts` become fetch calls and
 * both files are deleted. Nothing outside `spm-api.ts` imports from here, so no
 * page, component or type changes on that day.
 *
 * WHY IDS ARE GENERATED HERE, AND ONLY HERE
 * The platform rule is that the frontend never invents an entity id — the
 * backend supplies a GUID v7. There is no backend yet, so this module stands in
 * for one. No page, no component and no `spm-api.ts` function mints an id; they
 * ask this module, exactly as they will later ask the server. The rule's intent
 * — no id minted in UI code — is preserved, and the code is deleted with the file.
 *
 * PERSISTENCE
 * `sessionStorage`, so a created request survives a refresh and both sides of
 * the demo agree. Session-scoped on purpose: closing the tab resets the world
 * to the seed, which is what you want when showing it to someone twice.
 */

import { MOCK_REQUESTS, MOCK_TODAY } from './mock-data';
import type { Guid, InvestmentRequest, RequestStatus, RequestType } from './types';

const STORAGE_KEY = 'spm.mock-store.v1';

/** What the UI supplies when registering a request. Never carries an id. */
export interface CreateRequestInput {
  requestType: RequestType;
  investorAccountId: Guid;
  instrumentId: Guid;
  amount: number;
  units: number | null;
}

interface StoreShape {
  /** Requests created during this session, newest last. */
  created: InvestmentRequest[];
  /** Status overrides, keyed by request id — covers seed rows too. */
  statusById: Record<Guid, RequestStatus>;
  /** Monotonic counter behind the human-readable request number. */
  sequence: number;
}

const EMPTY: StoreShape = { created: [], statusById: {}, sequence: 0 };

/* ── persistence ──────────────────────────────────────────────────────────── */

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/** In-memory mirror so server-render and the first client paint agree. */
let memory: StoreShape = { ...EMPTY, created: [], statusById: {} };

function read(): StoreShape {
  if (!isBrowser()) return memory;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as StoreShape;
    memory = {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      statusById: parsed.statusById ?? {},
      sequence: typeof parsed.sequence === 'number' ? parsed.sequence : 0,
    };
    return memory;
  } catch {
    // A corrupt or unreadable store must never break the screens: fall back to
    // the seed rather than throwing. Same reasoning as a cache miss.
    return memory;
  }
}

function write(next: StoreShape): void {
  memory = next;
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or a privacy mode that blocks storage. The in-memory mirror still
    // holds, so the flow works for this page view.
  }
}

/* ── id generation — the backend's job, done here because there is no backend ── */

/**
 * A v7-shaped GUID: 48-bit big-endian timestamp, version 7, variant 10xx.
 * Time-ordered like the real `Guid.CreateVersion7()`, so ids sort the way the
 * backend's will and nothing downstream has to care that these are local.
 */
function newIdV7(): Guid {
  const ms = Date.now();
  const bytes = new Uint8Array(16);

  bytes[0] = (ms / 0x10000000000) & 0xff;
  bytes[1] = (ms / 0x100000000) & 0xff;
  bytes[2] = (ms / 0x1000000) & 0xff;
  bytes[3] = (ms / 0x10000) & 0xff;
  bytes[4] = (ms / 0x100) & 0xff;
  bytes[5] = ms & 0xff;

  for (let i = 6; i < 16; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The de-duplication token. The real service derives this server-side from the
 * request's own fields — see proposal §13-5 — so the same submission replayed
 * cannot create a second request. Derived the same way here so the behaviour is
 * demonstrable rather than merely described.
 */
function idempotencyKeyFor(input: CreateRequestInput): string {
  return [
    input.requestType,
    input.investorAccountId,
    input.instrumentId,
    input.amount,
    input.units ?? '',
  ].join('|');
}

/* ── reads ────────────────────────────────────────────────────────────────── */

/** Seed rows plus anything created this session, with status overrides applied. */
export function listRequests(): InvestmentRequest[] {
  const store = read();
  const all = [...MOCK_REQUESTS, ...store.created];
  return all.map((r) =>
    store.statusById[r.id] ? { ...r, status: store.statusById[r.id] } : r,
  );
}

export function findRequest(id: Guid): InvestmentRequest | undefined {
  return listRequests().find((r) => r.id === id);
}

/* ── writes ───────────────────────────────────────────────────────────────── */

export interface CreateRequestResult {
  request: InvestmentRequest;
  /** True when an identical submission already existed and was returned instead. */
  deduplicated: boolean;
}

/**
 * Registers a capital deposit or withdrawal request — proposal §7-1 and §7-2.
 *
 * Idempotent by §13-5: a submission whose key matches an existing request
 * returns that request rather than creating a second one. That is the whole
 * point of the rule, so it is enforced here rather than left as a comment.
 */
export function addRequest(input: CreateRequestInput): CreateRequestResult {
  const store = read();
  const key = idempotencyKeyFor(input);

  const existing = [...MOCK_REQUESTS, ...store.created].find(
    (r) => r.idempotencyKey === key,
  );
  if (existing) {
    return { request: existing, deduplicated: true };
  }

  const sequence = store.sequence + 1;
  const request: InvestmentRequest = {
    id: newIdV7(),
    requestNumber: `REQ-${String(9000 + sequence).padStart(4, '0')}`,
    requestType: input.requestType,
    status: 'Submitted',
    investorAccountId: input.investorAccountId,
    instrumentId: input.instrumentId,
    amount: input.amount,
    units: input.units,
    submittedAt: new Date().toISOString(),
    cutOffAt: null,
    needsManualReview: false,
    idempotencyKey: key,
  };

  write({ ...store, created: [...store.created, request], sequence });
  return { request, deduplicated: false };
}

/** Moves a request to a new status — the operator half of the §13-1 machine. */
export function setRequestStatus(id: Guid, status: RequestStatus): void {
  const store = read();
  write({ ...store, statusById: { ...store.statusById, [id]: status } });
}

/** Clears everything created this session and returns to the seed world. */
export function resetStore(): void {
  write({ ...EMPTY, created: [], statusById: {} });
}

/** Seed "today", so screens agree on what now means. */
export { MOCK_TODAY };
