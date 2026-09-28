'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Landmark,
  ListChecks,
  Scale,
  SearchX,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
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
import {
  getDiscrepancies,
  getLookupMaps,
  getReconciliationRuns,
} from '../components/spm-api';
import {
  DISCREPANCY_STATUS_VARIANT,
  DISCREPANCY_TYPE_LABEL,
  formatAmount,
  formatDate,
  formatDateTime,
  type BadgeVariant,
} from '../components/format';
import type {
  Discrepancy,
  DiscrepancyStatus,
  DiscrepancyType,
  Guid,
  InvestmentRequest,
  ReconciliationRun,
} from '../components/types';

/* ── local display maps ───────────────────────────────────────────────────── */

/** The four types the engine may raise — the order operators scan them in. */
const DISCREPANCY_TYPES: DiscrepancyType[] = [
  'MissingInOms',
  'MissingInBank',
  'AmountMismatch',
  'StatusMismatch',
];

const DISCREPANCY_STATUSES: DiscrepancyStatus[] = [
  'Open',
  'Investigating',
  'Resolved',
  'WrittenOff',
];

type RunStatus = ReconciliationRun['status'];

const RUN_STATUS_VARIANT: Record<RunStatus, BadgeVariant> = {
  Running: 'warning',
  Completed: 'success',
  Failed: 'destructive',
};

/** English fallbacks; the localized text comes from the i18n namespace. */
const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
};

const DISCREPANCY_STATUS_LABEL: Record<DiscrepancyStatus, string> = {
  Open: 'Open',
  Investigating: 'Investigating',
  Resolved: 'Resolved',
  WrittenOff: 'Written off',
};

const TYPE_ICON: Record<DiscrepancyType, LucideIcon> = {
  MissingInOms: SearchX,
  MissingInBank: Landmark,
  AmountMismatch: Scale,
  StatusMismatch: ArrowLeftRight,
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

/**
 * internal − external. A side that has no record at all counts as zero, so a
 * row missing in the bank shows the full internal amount as the gap.
 */
function difference(row: Discrepancy): number | null {
  if (row.internalAmount === null && row.externalAmount === null) return null;
  return (row.internalAmount ?? 0) - (row.externalAmount ?? 0);
}

interface TypeTile {
  type: DiscrepancyType;
  open: number;
  investigating: number;
  total: number;
}

const DISCREPANCY_COLUMN_COUNT = 9;
const RUN_COLUMN_COUNT = 9;

/* ── screen ───────────────────────────────────────────────────────────────── */

export function ReconciliationContent() {
  const { t } = useTranslation('spm-reconciliation');

  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [requests, setRequests] = useState<Record<Guid, InvestmentRequest>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<Guid | null>(null);
  const [typeFilter, setTypeFilter] = useState<DiscrepancyType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DiscrepancyStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([getReconciliationRuns(), getDiscrepancies(), getLookupMaps()])
      .then(([runRows, discrepancyRows, maps]) => {
        if (cancelled) return;
        setRuns(runRows);
        setDiscrepancies(discrepancyRows);
        setRequests(maps.requests);
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

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  /** Everything the selected run scope covers — the tiles and the table share it. */
  const scoped = useMemo(
    () =>
      selectedRunId
        ? discrepancies.filter((row) => row.reconciliationRunId === selectedRunId)
        : discrepancies,
    [discrepancies, selectedRunId],
  );

  const tiles = useMemo<TypeTile[]>(
    () =>
      DISCREPANCY_TYPES.map((type) => {
        const ofType = scoped.filter((row) => row.discrepancyType === type);
        return {
          type,
          open: ofType.filter((row) => row.status === 'Open').length,
          investigating: ofType.filter((row) => row.status === 'Investigating').length,
          total: ofType.length,
        };
      }),
    [scoped],
  );

  const filtered = useMemo(
    () =>
      scoped.filter((row) => {
        if (typeFilter !== 'all' && row.discrepancyType !== typeFilter) return false;
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        return true;
      }),
    [scoped, typeFilter, statusFilter],
  );

  const typeLabel = (type: DiscrepancyType) =>
    t(`types.${type}`, { defaultValue: DISCREPANCY_TYPE_LABEL[type] });

  const statusLabel = (status: DiscrepancyStatus) =>
    t(`statuses.${status}`, { defaultValue: DISCREPANCY_STATUS_LABEL[status] });

  const runStatusLabel = (status: RunStatus) =>
    t(`runStatuses.${status}`, { defaultValue: RUN_STATUS_LABEL[status] });

  const description = t('toolbar.description', {
    defaultValue:
      'Daily three-way match of internal records, OMS trades and bank statements, with every discrepancy it raised.',
  });

  if (loading) {
    return (
      <SectionShell
        title={t('title', { defaultValue: 'Reconciliation' })}
        description={description}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
          {DISCREPANCY_TYPES.map((type) => (
            <Card key={type}>
              <CardContent className="py-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('runs.title', { defaultValue: 'Reconciliation runs' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('discrepancies.title', { defaultValue: 'Discrepancies' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title={t('title', { defaultValue: 'Reconciliation' })}
      description={description}
      actions={
        selectedRun ? (
          <Button variant="outline" size="sm" onClick={() => setSelectedRunId(null)}>
            <X className="h-4 w-4" />
            {t('runs.clear', { defaultValue: 'Show all runs' })}
          </Button>
        ) : null
      }
    >
      {error ? (
        <Alert variant="destructive" icon="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('error', { defaultValue: 'Could not load reconciliation data.' })}
          </AlertTitle>
        </Alert>
      ) : null}

      {/* Which way is the book wrong — open count per discrepancy type. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
        {tiles.map((tile) => {
          const Icon = TYPE_ICON[tile.type];
          const active = typeFilter === tile.type;
          return (
            <Card
              key={tile.type}
              className={active ? 'ring-2 ring-primary/60' : undefined}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => setTypeFilter(active ? 'all' : tile.type)}
                  className="flex w-full items-start gap-3 p-5 text-start"
                  aria-pressed={active}
                >
                  <span
                    className={
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' +
                      (tile.open > 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground')
                    }
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block text-sm font-medium text-foreground">
                      {typeLabel(tile.type)}
                    </span>
                    <span
                      className={
                        'block text-2xl font-semibold leading-tight mt-1 ' +
                        (tile.open > 0 ? 'text-destructive' : 'text-foreground')
                      }
                    >
                      {tile.open.toLocaleString('en-US')}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {t('tiles.summary', {
                        defaultValue: '{{investigating}} investigating · {{total}} detected',
                        investigating: tile.investigating.toLocaleString('en-US'),
                        total: tile.total.toLocaleString('en-US'),
                      })}
                    </span>
                  </span>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Runs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('runs.title', { defaultValue: 'Reconciliation runs' })}</CardTitle>
          <CardToolbar>
            <span className="text-xs text-muted-foreground">
              {selectedRun
                ? t('runs.selected', {
                    defaultValue: 'Filtered to the run of {{date}}',
                    date: formatDate(selectedRun.runDate),
                  })
                : t('runs.hint', {
                    defaultValue: 'Click a run to filter the discrepancies below',
                  })}
            </span>
            {selectedRun ? (
              <Button variant="outline" size="sm" onClick={() => setSelectedRunId(null)}>
                <X className="h-4 w-4" />
                {t('runs.clear', { defaultValue: 'Show all runs' })}
              </Button>
            ) : null}
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('runs.columns.runDate', { defaultValue: 'Run date' })}</TableHead>
                  <TableHead>{t('runs.columns.startedAt', { defaultValue: 'Started' })}</TableHead>
                  <TableHead>
                    {t('runs.columns.completedAt', { defaultValue: 'Completed' })}
                  </TableHead>
                  <TableHead>{t('runs.columns.internal', { defaultValue: 'Internal' })}</TableHead>
                  <TableHead>{t('runs.columns.oms', { defaultValue: 'OMS' })}</TableHead>
                  <TableHead>{t('runs.columns.bank', { defaultValue: 'Bank' })}</TableHead>
                  <TableHead>{t('runs.columns.matched', { defaultValue: 'Matched' })}</TableHead>
                  <TableHead>
                    {t('runs.columns.discrepancies', { defaultValue: 'Discrepancies' })}
                  </TableHead>
                  <TableHead>{t('runs.columns.status', { defaultValue: 'Status' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={RUN_COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t('runs.empty', { defaultValue: 'No reconciliation run has been recorded yet.' })}
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => {
                    const isSelected = run.id === selectedRunId;
                    return (
                      <TableRow
                        key={run.id}
                        onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                        className={
                          'cursor-pointer ' +
                          (isSelected
                            ? 'bg-blue-100/70 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60'
                            : '')
                        }
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          <span className="flex items-center gap-2">
                            <ListChecks
                              className={
                                'h-4 w-4 ' +
                                (isSelected ? 'text-primary' : 'text-muted-foreground')
                              }
                            />
                            {formatDate(run.runDate)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(run.startedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(run.completedAt)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {run.internalCount.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {run.omsCount.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {run.bankCount.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {run.matchedCount.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell
                          className={
                            'font-mono text-sm ' +
                            (run.discrepancyCount > 0 ? 'text-destructive font-semibold' : '')
                          }
                        >
                          {run.discrepancyCount.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={RUN_STATUS_VARIANT[run.status]} appearance="light">
                            {runStatusLabel(run.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Discrepancies */}
      <Card>
        <CardHeader>
          <CardTitle>{t('discrepancies.title', { defaultValue: 'Discrepancies' })}</CardTitle>
          <CardToolbar>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t('discrepancies.showing', {
                defaultValue: '{{shown}} of {{total}} rows',
                shown: filtered.length.toLocaleString('en-US'),
                total: scoped.length.toLocaleString('en-US'),
              })}
            </span>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as DiscrepancyType | 'all')}
            >
              <SelectTrigger className="w-52">
                <SelectValue
                  placeholder={t('filters.allTypes', { defaultValue: 'All types' })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('filters.allTypes', { defaultValue: 'All types' })}
                </SelectItem>
                {DISCREPANCY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as DiscrepancyStatus | 'all')}
            >
              <SelectTrigger className="w-44">
                <SelectValue
                  placeholder={t('filters.allStatuses', { defaultValue: 'All statuses' })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('filters.allStatuses', { defaultValue: 'All statuses' })}
                </SelectItem>
                {DISCREPANCY_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeFilter !== 'all' || statusFilter !== 'all' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
              >
                <X className="h-4 w-4" />
                {t('filters.clear', { defaultValue: 'Clear filters' })}
              </Button>
            ) : null}
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('discrepancies.columns.type', { defaultValue: 'Type' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.status', { defaultValue: 'Status' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.request', { defaultValue: 'Request' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.internalAmount', { defaultValue: 'Internal amount' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.externalAmount', { defaultValue: 'External amount' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.difference', { defaultValue: 'Difference' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.externalRef', { defaultValue: 'External ref' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.assignedTo', { defaultValue: 'Assigned to' })}
                  </TableHead>
                  <TableHead>
                    {t('discrepancies.columns.detectedAt', { defaultValue: 'Detected at' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={DISCREPANCY_COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t('discrepancies.empty', {
                        defaultValue: 'No discrepancy matches the current filters.',
                      })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const gap = difference(row);
                    const request = row.requestId ? requests[row.requestId] : undefined;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {typeLabel(row.discrepancyType)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={DISCREPANCY_STATUS_VARIANT[row.status]}
                            appearance="light"
                          >
                            {statusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.requestId ? (
                            <Link
                              href={`/requests/${row.requestId}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {request?.requestNumber ?? row.requestId}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {formatAmount(row.internalAmount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {formatAmount(row.externalAmount)}
                        </TableCell>
                        <TableCell
                          className={
                            'whitespace-nowrap font-mono text-sm ' +
                            (gap !== null && gap !== 0 ? 'text-destructive font-semibold' : '')
                          }
                        >
                          {gap === null
                            ? '—'
                            : `${gap > 0 ? '+' : ''}${formatAmount(gap)}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {row.externalRef ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {row.assignedTo ?? (
                            <span className="text-muted-foreground italic">
                              {t('discrepancies.unassigned', { defaultValue: 'Unassigned' })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(row.detectedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
