'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CircleCheck, Search, X } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../components/section-shell';
import { getLookupMaps, getSettlements } from '../components/spm-api';
/* MOCK_TODAY is imported ONLY as the "now" reference for overdue arithmetic —
   `new Date()` during render would desynchronise server and client markup. */
import { MOCK_TODAY } from '../components/mock-data';
import {
  SETTLEMENT_STATUS_VARIANT,
  formatAmount,
  formatAmountCompact,
  formatDate,
  formatDateTime,
} from '../components/format';
import type { Settlement, SettlementStatus } from '../components/types';

type LookupMaps = Awaited<ReturnType<typeof getLookupMaps>>;

type StatusFilter = SettlementStatus | 'ALL';

const STATUS_ORDER: SettlementStatus[] = [
  'PendingSale',
  'SaleExecuted',
  'PendingSettlement',
  'Settled',
  'Delayed',
  'Failed',
  'Reversed',
];

/** English fallbacks so the screen reads correctly before translations load. */
const STATUS_FALLBACK: Record<SettlementStatus, string> = {
  PendingSale: 'Pending sale',
  SaleExecuted: 'Sale executed',
  PendingSettlement: 'Pending settlement',
  Settled: 'Settled',
  Delayed: 'Delayed',
  Failed: 'Failed',
  Reversed: 'Reversed',
};

/** Statuses that still owe the investor money. */
const OUTSTANDING_STATUSES: SettlementStatus[] = [
  'PendingSale',
  'SaleExecuted',
  'PendingSettlement',
  'Delayed',
  'Failed',
];

/** The two buckets an operator must act on. */
const ACTION_STATUSES: SettlementStatus[] = ['Delayed', 'Failed'];

const MS_PER_DAY = 86_400_000;

/** Whole days between two ISO instants, compared date-only (UTC). */
function dayDiff(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00.000Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00.000Z`);
  return Math.round((to - from) / MS_PER_DAY);
}

interface SettlementRow {
  settlement: Settlement;
  requestNumber: string;
  requestId: string;
  investorName: string;
  /** Positive when the due date has passed and the row is not yet settled. */
  overdueDays: number;
  isDueToday: boolean;
}

interface TileProps {
  label: string;
  value: string;
  hint?: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
}

const TILE_TONE: Record<TileProps['tone'], string> = {
  neutral: 'text-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-green-600 dark:text-green-400',
};

function Tile({ label, value, hint, tone }: TileProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`mt-2 text-2xl font-semibold tabular-nums ${TILE_TONE[tone]}`}>{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function OverdueChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <AlertTriangle className="size-3" />
      {label}
    </span>
  );
}

export function SettlementsContent() {
  const { t, i18n } = useTranslation('spm-settlements');
  const isFa = i18n.language === 'fa';

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [lookups, setLookups] = useState<LookupMaps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([getSettlements(), getLookupMaps()])
      .then(([rows, maps]) => {
        if (cancelled) return;
        setSettlements(rows);
        setLookups(maps);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = (status: SettlementStatus) =>
    t(`status.${status}`, { defaultValue: STATUS_FALLBACK[status] });

  const rows = useMemo<SettlementRow[]>(() => {
    return settlements.map((settlement) => {
      const request = lookups?.requests[settlement.requestId] ?? null;
      const account = request ? (lookups?.accounts[request.investorAccountId] ?? null) : null;
      const elapsed = dayDiff(settlement.settlementDueDate, MOCK_TODAY);

      return {
        settlement,
        requestId: settlement.requestId,
        requestNumber: request?.requestNumber ?? '—',
        investorName: account ? (isFa ? account.fullNameFa : account.fullNameEn) : '—',
        overdueDays: settlement.status === 'Settled' ? 0 : Math.max(0, elapsed),
        isDueToday: elapsed === 0,
      };
    });
  }, [settlements, lookups, isFa]);

  const actionRows = useMemo<SettlementRow[]>(
    () => rows.filter((row) => ACTION_STATUSES.includes(row.settlement.status)),
    [rows],
  );

  const filteredRows = useMemo<SettlementRow[]>(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.settlement.status !== statusFilter) return false;
      if (term && !row.requestNumber.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, statusFilter, search]);

  const summary = useMemo(() => {
    let dueToday = 0;
    let delayed = 0;
    let failed = 0;
    let settled = 0;
    let outstandingNet = 0;

    rows.forEach(({ settlement, isDueToday }) => {
      if (isDueToday && settlement.status !== 'Settled') dueToday += 1;
      if (settlement.status === 'Delayed') delayed += 1;
      if (settlement.status === 'Failed') failed += 1;
      if (settlement.status === 'Settled') settled += 1;
      if (OUTSTANDING_STATUSES.includes(settlement.status)) outstandingNet += settlement.netPayable;
    });

    return { dueToday, delayed, failed, settled, outstandingNet };
  }, [rows]);

  const overdueLabel = (days: number) =>
    t('badges.overdue', { defaultValue: 'Overdue by {{days}} d', days });

  if (error) {
    return (
      <SectionShell
        title={t('toolbar.title', { defaultValue: 'Settlements' })}
        description={t('toolbar.description', {
          defaultValue:
            'Settlement queue — what is due, what is late, and what still has to be paid out.',
        })}
      >
        <Alert variant="destructive" icon="destructive">
          <AlertIcon>
            <AlertTriangle />
          </AlertIcon>
          <AlertTitle>
            {t('state.error', { defaultValue: 'Could not load the settlement queue.' })} {error}
          </AlertTitle>
        </Alert>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Settlements' })}
      description={t('toolbar.description', {
        defaultValue:
          'Settlement queue — what is due, what is late, and what still has to be paid out.',
      })}
    >
      {/* ── summary tiles ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 lg:gap-7.5">
        {loading ? (
          [0, 1, 2, 3, 4].map((index) => (
            <Card key={index}>
              <CardContent className="py-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Tile
              tone="neutral"
              label={t('tiles.dueToday', { defaultValue: 'Due today' })}
              value={String(summary.dueToday)}
              hint={formatDate(MOCK_TODAY)}
            />
            <Tile
              tone="warning"
              label={t('tiles.delayed', { defaultValue: 'Delayed' })}
              value={String(summary.delayed)}
              hint={t('tiles.delayedHint', { defaultValue: 'Needs an operator' })}
            />
            <Tile
              tone="danger"
              label={t('tiles.failed', { defaultValue: 'Failed' })}
              value={String(summary.failed)}
              hint={t('tiles.failedHint', { defaultValue: 'Needs an operator' })}
            />
            <Tile
              tone="success"
              label={t('tiles.settled', { defaultValue: 'Settled this period' })}
              value={String(summary.settled)}
              hint={t('tiles.settledHint', { defaultValue: 'Paid out in full' })}
            />
            <Tile
              tone="neutral"
              label={t('tiles.outstanding', { defaultValue: 'Outstanding net payable' })}
              value={formatAmountCompact(summary.outstandingNet)}
              hint={`${formatAmount(summary.outstandingNet)} ${t('units.rial', { defaultValue: 'IRR' })}`}
            />
          </>
        )}
      </div>

      {/* ── action bucket: delayed + failed ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            {t('attention.title', { defaultValue: 'Needs attention — delayed & failed' })}
          </CardTitle>
          <CardToolbar>
            <Badge variant={actionRows.length ? 'destructive' : 'success'} appearance="light">
              {t('attention.count', {
                defaultValue: '{{items}} to act on',
                items: actionRows.length,
              })}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : actionRows.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <CircleCheck className="size-4 text-green-600 dark:text-green-400" />
              {t('attention.empty', {
                defaultValue: 'No delayed or failed settlements. Nothing to act on.',
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.requestNumber', { defaultValue: 'Request no.' })}</TableHead>
                    <TableHead>{t('table.investor', { defaultValue: 'Investor' })}</TableHead>
                    <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                    <TableHead>{t('table.dueDate', { defaultValue: 'Settlement due' })}</TableHead>
                    <TableHead className="text-end">
                      {t('table.netPayable', { defaultValue: 'Net payable' })}
                    </TableHead>
                    <TableHead>{t('table.failureReason', { defaultValue: 'Failure reason' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionRows.map((row) => (
                    <TableRow
                      key={row.settlement.id}
                      className={
                        row.settlement.status === 'Failed'
                          ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                          : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50'
                      }
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        <Link
                          href={`/requests/${row.requestId}`}
                          className="text-primary hover:underline"
                        >
                          {row.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.investorName}</TableCell>
                      <TableCell>
                        <Badge variant={SETTLEMENT_STATUS_VARIANT[row.settlement.status]}>
                          {statusLabel(row.settlement.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {formatDate(row.settlement.settlementDueDate)}
                          </span>
                          {row.overdueDays > 0 ? (
                            <OverdueChip label={overdueLabel(row.overdueDays)} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums whitespace-nowrap">
                        {formatAmount(row.settlement.netPayable)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.settlement.failureReason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── full queue ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('table.title', { defaultValue: 'Settlement queue' })}</CardTitle>
          <CardToolbar>
            <span className="text-xs text-muted-foreground">
              {t('filters.showing', {
                defaultValue: 'Showing {{shown}} of {{total}}',
                shown: filteredRows.length,
                total: rows.length,
              })}
            </span>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t('filters.status', { defaultValue: 'Status' })}
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t('filters.allStatuses', { defaultValue: 'All statuses' })}
                  </SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[220px] max-w-sm flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t('filters.search', { defaultValue: 'Request number' })}
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filters.searchPlaceholder', { defaultValue: 'e.g. SPM-1405-0014' })}
                  className="ps-8"
                />
              </div>
            </div>

            {statusFilter !== 'ALL' || search ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearch('');
                }}
              >
                <X className="size-4" />
                {t('filters.reset', { defaultValue: 'Clear filters' })}
              </Button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.requestNumber', { defaultValue: 'Request no.' })}</TableHead>
                  <TableHead>{t('table.investor', { defaultValue: 'Investor' })}</TableHead>
                  <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead>{t('table.tradeDate', { defaultValue: 'Trade date' })}</TableHead>
                  <TableHead>{t('table.dueDate', { defaultValue: 'Settlement due' })}</TableHead>
                  <TableHead className="text-end">
                    {t('table.gross', { defaultValue: 'Gross amount' })}
                  </TableHead>
                  <TableHead className="text-end">{t('table.fee', { defaultValue: 'Fee' })}</TableHead>
                  <TableHead className="text-end">
                    {t('table.netPayable', { defaultValue: 'Net payable' })}
                  </TableHead>
                  <TableHead>{t('table.paidAt', { defaultValue: 'Paid at' })}</TableHead>
                  <TableHead>{t('table.failureReason', { defaultValue: 'Failure reason' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3, 4].map((index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      {t('table.empty', {
                        defaultValue: 'No settlement matches the current filters.',
                      })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.settlement.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        <Link
                          href={`/requests/${row.requestId}`}
                          className="text-primary hover:underline"
                        >
                          {row.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.investorName}</TableCell>
                      <TableCell>
                        <Badge variant={SETTLEMENT_STATUS_VARIANT[row.settlement.status]}>
                          {statusLabel(row.settlement.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDate(row.settlement.tradeDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {formatDate(row.settlement.settlementDueDate)}
                          </span>
                          {row.overdueDays > 0 ? (
                            <OverdueChip label={overdueLabel(row.overdueDays)} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums whitespace-nowrap">
                        {formatAmount(row.settlement.grossAmount)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums whitespace-nowrap">
                        {formatAmount(row.settlement.feeAmount)}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums whitespace-nowrap">
                        {formatAmount(row.settlement.netPayable)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(row.settlement.paidAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.settlement.failureReason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
