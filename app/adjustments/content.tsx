'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, TriangleAlert, X } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../components/section-shell';
import { getAdjustments, getDiscrepancies } from '../components/spm-api';
import {
  DISCREPANCY_TYPE_LABEL,
  formatAmount,
  formatAmountCompact,
  formatDateTime,
  type BadgeVariant,
} from '../components/format';
import type { Discrepancy, DiscrepancyType, Guid, ManualAdjustment } from '../components/types';

/* ── local display maps ───────────────────────────────────────────────────── */

type AdjustmentStatus = ManualAdjustment['status'];

const STATUS_VARIANT: Record<AdjustmentStatus, BadgeVariant> = {
  PendingFirst: 'warning',
  PendingSecond: 'warning',
  Approved: 'success',
  Rejected: 'destructive',
};

/** English fallbacks only — the displayed copy comes from the i18n files. */
const STATUS_LABEL: Record<AdjustmentStatus, string> = {
  PendingFirst: 'Pending first approval',
  PendingSecond: 'Pending second approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

const STATUS_ORDER: AdjustmentStatus[] = ['PendingFirst', 'PendingSecond', 'Approved', 'Rejected'];

const PENDING_STATUSES: AdjustmentStatus[] = ['PendingFirst', 'PendingSecond'];

/**
 * Short, quotable form of a backend GUID: the time block plus the discriminating
 * block, e.g. `01991f2a-8105`. Purely a display helper — no id is ever invented here.
 */
function shortId(id: Guid): string {
  const parts = id.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : id.slice(0, 13);
}

/* ── two-step approval indicator ──────────────────────────────────────────── */

type StepState = 'done' | 'pending' | 'blocked';

const STEP_CLASS: Record<StepState, string> = {
  done: 'border-green-500 bg-green-500 text-white',
  pending: 'border-dashed border-muted-foreground/40 text-muted-foreground',
  blocked: 'border-destructive/50 bg-destructive/10 text-destructive',
};

interface ApprovalStepsProps {
  adjustment: ManualAdjustment;
  firstLabel: string;
  secondLabel: string;
}

function ApprovalSteps({ adjustment, firstLabel, secondLabel }: ApprovalStepsProps) {
  const rejected = adjustment.status === 'Rejected';

  const firstState: StepState = adjustment.firstApprovedAt
    ? 'done'
    : rejected
      ? 'blocked'
      : 'pending';
  const secondState: StepState = adjustment.secondApprovedAt
    ? 'done'
    : rejected
      ? 'blocked'
      : 'pending';

  return (
    <div className="flex items-center gap-1.5">
      <span
        title={firstLabel}
        className={`inline-flex size-5 items-center justify-center rounded-full border text-[0.625rem] font-semibold ${STEP_CLASS[firstState]}`}
      >
        1
      </span>
      <span
        aria-hidden="true"
        className={`h-px w-3 ${adjustment.secondApprovedAt ? 'bg-green-500' : 'bg-border'}`}
      />
      <span
        title={secondLabel}
        className={`inline-flex size-5 items-center justify-center rounded-full border text-[0.625rem] font-semibold ${STEP_CLASS[secondState]}`}
      >
        2
      </span>
    </div>
  );
}

/* ── summary tile ─────────────────────────────────────────────────────────── */

interface TileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

function Tile({ label, value, hint, accent }: TileProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`mt-2 text-2xl font-semibold ${accent ?? 'text-foreground'}`}>{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

/* ── table ────────────────────────────────────────────────────────────────── */

interface AdjustmentsTableProps {
  rows: ManualAdjustment[];
  discrepancyById: Record<Guid, Discrepancy>;
  showActions: boolean;
  emptyMessage: string;
}

function AdjustmentsTable({
  rows,
  discrepancyById,
  showActions,
  emptyMessage,
}: AdjustmentsTableProps) {
  const { t } = useTranslation('spm-adjustments');

  const columnCount = showActions ? 10 : 9;
  const notYet = t('table.notYet', { defaultValue: 'Not yet' });
  const readOnlyTooltip = t('actions.readOnlyTooltip', {
    defaultValue: 'Read-only until the SPM service is connected',
  });

  const typeLabel = (type: DiscrepancyType): string =>
    t(`discrepancyType.${type}`, { defaultValue: DISCREPANCY_TYPE_LABEL[type] });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">
              {t('table.amount', { defaultValue: 'Amount (IRR)' })}
            </TableHead>
            <TableHead>{t('table.reason', { defaultValue: 'Reason' })}</TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.discrepancy', { defaultValue: 'Linked discrepancy' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.requestedBy', { defaultValue: 'Requested by' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.requestedAt', { defaultValue: 'Requested at' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.firstApprover', { defaultValue: 'First approver' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.secondApprover', { defaultValue: 'Second approver' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.approval', { defaultValue: 'Approval' })}
            </TableHead>
            <TableHead className="whitespace-nowrap">
              {t('table.status', { defaultValue: 'Status' })}
            </TableHead>
            {showActions ? (
              <TableHead className="whitespace-nowrap">
                {t('table.actions', { defaultValue: 'Actions' })}
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-10 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const discrepancy = discrepancyById[row.discrepancyId];
              const isPending = PENDING_STATUSES.includes(row.status);

              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-mono text-sm font-medium">
                    {formatAmount(row.amount)}
                  </TableCell>
                  <TableCell className="max-w-[22rem] text-sm">{row.reason}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {discrepancy ? (
                        <Badge variant="secondary" appearance="light" size="sm">
                          {typeLabel(discrepancy.discrepancyType)}
                        </Badge>
                      ) : null}
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {shortId(row.discrepancyId)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{row.requestedBy}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {formatDateTime(row.requestedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span>{row.firstApprover ?? notYet}</span>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {formatDateTime(row.firstApprovedAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span>{row.secondApprover ?? notYet}</span>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {formatDateTime(row.secondApprovedAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ApprovalSteps
                      adjustment={row}
                      firstLabel={t('steps.first', { defaultValue: 'Step 1 - first approval' })}
                      secondLabel={t('steps.second', { defaultValue: 'Step 2 - second approval' })}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={STATUS_VARIANT[row.status]} appearance="light" size="sm">
                      {t(`status.${row.status}`, { defaultValue: STATUS_LABEL[row.status] })}
                    </Badge>
                  </TableCell>
                  {showActions ? (
                    <TableCell className="whitespace-nowrap">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button size="sm" variant="outline" disabled>
                                  {t('actions.approve', { defaultValue: 'Approve' })}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{readOnlyTooltip}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button size="sm" variant="outline" disabled>
                                  {t('actions.reject', { defaultValue: 'Reject' })}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{readOnlyTooltip}</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('table.noAction', { defaultValue: 'No action' })}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */

export function AdjustmentsContent() {
  const { t } = useTranslation('spm-adjustments');

  const [adjustments, setAdjustments] = useState<ManualAdjustment[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdjustmentStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([getAdjustments(), getDiscrepancies()])
      .then(([adjustmentRows, discrepancyRows]) => {
        if (cancelled) return;
        setAdjustments(adjustmentRows);
        setDiscrepancies(discrepancyRows);
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

  const discrepancyById = useMemo(() => {
    const map: Record<Guid, Discrepancy> = {};
    discrepancies.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [discrepancies]);

  const queue = useMemo(
    () => adjustments.filter((a) => PENDING_STATUSES.includes(a.status)),
    [adjustments],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return adjustments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!term) return true;

      const discrepancy = discrepancyById[a.discrepancyId];
      const haystack = [
        a.reason,
        a.requestedBy,
        a.firstApprover ?? '',
        a.secondApprover ?? '',
        a.status,
        shortId(a.discrepancyId),
        discrepancy ? DISCREPANCY_TYPE_LABEL[discrepancy.discrepancyType] : '',
        String(a.amount),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [adjustments, discrepancyById, search, statusFilter]);

  const stats = useMemo(() => {
    const approvedRows = adjustments.filter((a) => a.status === 'Approved');
    return {
      pendingFirst: adjustments.filter((a) => a.status === 'PendingFirst').length,
      pendingSecond: adjustments.filter((a) => a.status === 'PendingSecond').length,
      approved: approvedRows.length,
      totalAdjusted: approvedRows.reduce((sum, a) => sum + a.amount, 0),
    };
  }, [adjustments]);

  const isFiltered = search.trim().length > 0 || statusFilter !== 'all';

  const readOnlyTooltip = t('actions.readOnlyTooltip', {
    defaultValue: 'Read-only until the SPM service is connected',
  });

  const actions = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button variant="outline" disabled>
            {t('actions.new', { defaultValue: 'New adjustment' })}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{readOnlyTooltip}</TooltipContent>
    </Tooltip>
  );

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Adjustments' })}
      description={t('toolbar.description', {
        defaultValue:
          'Manual ledger corrections raised against a reconciliation discrepancy. Each one needs two separate approvers before it is applied.',
      })}
      actions={actions}
    >
      {error ? (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('state.error', { defaultValue: 'Could not load adjustments.' })} {error}
          </AlertTitle>
        </Alert>
      ) : null}

      {/* summary tiles */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 lg:gap-7.5">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          <>
            <Tile
              label={t('tiles.pendingFirst', { defaultValue: 'Pending first approval' })}
              value={String(stats.pendingFirst)}
              accent="text-amber-600 dark:text-amber-400"
            />
            <Tile
              label={t('tiles.pendingSecond', { defaultValue: 'Pending second approval' })}
              value={String(stats.pendingSecond)}
              accent="text-amber-600 dark:text-amber-400"
            />
            <Tile
              label={t('tiles.approved', { defaultValue: 'Approved' })}
              value={String(stats.approved)}
              accent="text-green-600 dark:text-green-400"
            />
            <Tile
              label={t('tiles.totalAdjusted', { defaultValue: 'Total adjusted value' })}
              value={formatAmountCompact(stats.totalAdjusted)}
              hint={t('tiles.totalAdjustedHint', {
                defaultValue: '{{amount}} IRR, approved adjustments only',
                amount: formatAmount(stats.totalAdjusted),
              })}
            />
          </>
        )}
      </div>

      {/* actionable queue */}
      <Card className="ring-1 ring-amber-400/60 dark:ring-amber-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('queue.title', { defaultValue: 'Awaiting approval' })}
            {loading ? null : (
              <Badge variant="warning" appearance="light" size="sm">
                {queue.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('queue.description', {
              defaultValue:
                'Adjustments that still need an approval step. Approving is disabled until the SPM service is connected.',
            })}
          </p>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <AdjustmentsTable
              rows={queue}
              discrepancyById={discrepancyById}
              showActions
              emptyMessage={t('queue.empty', { defaultValue: 'Nothing is waiting for approval.' })}
            />
          )}
        </CardContent>
      </Card>

      {/* filters + full history */}
      <Card>
        <CardHeader>
          <CardTitle>{t('history.title', { defaultValue: 'Adjustment history' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('filters.searchPlaceholder', {
                  defaultValue: 'Search reason, requester or approver',
                })}
                className="ps-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AdjustmentStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder={t('filters.status', { defaultValue: 'Status' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('filters.all', { defaultValue: 'All statuses' })}
                </SelectItem>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${status}`, { defaultValue: STATUS_LABEL[status] })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                <X className="size-4" />
                {t('filters.clear', { defaultValue: 'Clear filters' })}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <AdjustmentsTable
              rows={filtered}
              discrepancyById={discrepancyById}
              showActions={false}
              emptyMessage={
                isFiltered
                  ? t('history.emptyFiltered', {
                      defaultValue: 'No adjustment matches the current filters.',
                    })
                  : t('history.empty', { defaultValue: 'No adjustment has been recorded yet.' })
              }
            />
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
