'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CircleDot,
  Clock,
  Hourglass,
  Inbox,
  MessageSquare,
  TriangleAlert,
  UserRound,
  UserRoundX,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShellWithSidebar } from '../components/section-shell';
import { formatDateTime, hoursUntil, type BadgeVariant } from '../components/format';
/** MOCK_TODAY is imported ONLY as the "now" reference for the SLA clock. */
import { MOCK_TODAY } from '../components/mock-data';
import { getCases } from '../components/spm-api';
import type { CaseStatus, ResolutionCase, SourceType } from '../components/types';

/* ── static maps ──────────────────────────────────────────────────────────── */

const CASE_STATUSES: CaseStatus[] = ['Open', 'Assigned', 'Waiting', 'Resolved', 'Closed'];

const CASE_STATUS_VARIANT: Record<CaseStatus, BadgeVariant> = {
  Open: 'destructive',
  Assigned: 'primary',
  Waiting: 'warning',
  Resolved: 'success',
  Closed: 'secondary',
};

/** English fallbacks — the real text comes from the i18n files. */
const CASE_STATUS_FALLBACK: Record<CaseStatus, string> = {
  Open: 'Open',
  Assigned: 'Assigned',
  Waiting: 'Waiting',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

const SOURCE_TYPE_FALLBACK: Record<SourceType, string> = {
  Request: 'Request',
  Order: 'Order',
  Settlement: 'Settlement',
  Payment: 'Payment',
  Discrepancy: 'Discrepancy',
  Adjustment: 'Adjustment',
};

/* ── the 2-business-hour SLA clock ────────────────────────────────────────── */

type SlaTone = 'stopped' | 'ok' | 'due' | 'overdue';

interface Sla {
  tone: SlaTone;
  /** Whole hours until `dueAt`; negative means the case is past its deadline. */
  hours: number;
}

const SLA_VARIANT: Record<SlaTone, BadgeVariant> = {
  stopped: 'secondary',
  ok: 'success',
  due: 'warning',
  overdue: 'destructive',
};

/** A resolved or closed case no longer burns SLA time. */
function isClockStopped(status: CaseStatus): boolean {
  return status === 'Resolved' || status === 'Closed';
}

function slaFor(item: ResolutionCase): Sla {
  const hours = hoursUntil(item.dueAt, MOCK_TODAY);
  if (isClockStopped(item.status)) return { tone: 'stopped', hours };
  if (hours < 0) return { tone: 'overdue', hours };
  if (hours <= 1) return { tone: 'due', hours };
  return { tone: 'ok', hours };
}

/* ── tiles ────────────────────────────────────────────────────────────────── */

interface TileModel {
  key: string;
  icon: LucideIcon;
  label: string;
  value: number;
  iconClass: string;
}

function Tile({ tile }: { tile: TileModel }) {
  const Icon = tile.icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tile.iconClass}`}>
        <Icon className="size-4.5" />
      </span>
      <div className="flex flex-col">
        <span className="text-xl font-semibold leading-none tabular-nums">{tile.value}</span>
        <span className="mt-1 text-xs text-muted-foreground">{tile.label}</span>
      </div>
    </div>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */

export function ResolutionContent() {
  const { t } = useTranslation('spm-resolution');

  const [cases, setCases] = useState<ResolutionCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCases()
      .then((rows) => {
        if (cancelled) return;
        setCases(rows);
        setSelectedId(rows.length > 0 ? rows[0].id : null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'load-failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const byStatus: Record<CaseStatus, number> = {
      Open: 0,
      Assigned: 0,
      Waiting: 0,
      Resolved: 0,
      Closed: 0,
    };
    let unassigned = 0;
    let overdue = 0;
    cases.forEach((item) => {
      byStatus[item.status] += 1;
      if (!item.assignedTo) unassigned += 1;
      if (slaFor(item).tone === 'overdue') overdue += 1;
    });
    return { byStatus, unassigned, overdue, total: cases.length };
  }, [cases]);

  const filtered = useMemo(
    () =>
      cases.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (unassignedOnly && item.assignedTo) return false;
        return true;
      }),
    [cases, statusFilter, unassignedOnly],
  );

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const notes = useMemo(
    () =>
      selected
        ? [...selected.notes].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        : [],
    [selected],
  );

  /* ── labels ─────────────────────────────────────────────────────────────── */

  const statusText = (status: CaseStatus): string =>
    t(`status.${status}`, { defaultValue: CASE_STATUS_FALLBACK[status] });

  const sourceText = (source: SourceType): string =>
    t(`source.${source}`, { defaultValue: SOURCE_TYPE_FALLBACK[source] });

  const slaText = (sla: Sla): string => {
    if (sla.tone === 'stopped') return t('sla.stopped', { defaultValue: 'Clock stopped' });
    if (sla.tone === 'overdue')
      return t('sla.overdue', {
        defaultValue: 'Overdue by {{hours}}h',
        hours: Math.abs(sla.hours),
      });
    if (sla.hours <= 0) return t('sla.dueNow', { defaultValue: 'Due now' });
    return t('sla.remaining', { defaultValue: '{{hours}}h left', hours: sla.hours });
  };

  const unassignedText = t('table.unassigned', { defaultValue: 'Unassigned' });

  const handleStatusChange = (value: string) => {
    const match = CASE_STATUSES.find((status) => status === value);
    setStatusFilter(match ?? 'all');
  };

  /* ── tiles ──────────────────────────────────────────────────────────────── */

  const tiles: TileModel[] = [
    {
      key: 'open',
      icon: Inbox,
      label: t('tiles.open', { defaultValue: 'Open' }),
      value: counts.byStatus.Open,
      iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      key: 'assigned',
      icon: UserRound,
      label: t('tiles.assigned', { defaultValue: 'Assigned' }),
      value: counts.byStatus.Assigned,
      iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    },
    {
      key: 'waiting',
      icon: Hourglass,
      label: t('tiles.waiting', { defaultValue: 'Waiting' }),
      value: counts.byStatus.Waiting,
      iconClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    },
    {
      key: 'overdue',
      icon: TriangleAlert,
      label: t('tiles.overdue', { defaultValue: 'Overdue' }),
      value: counts.overdue,
      iconClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    },
  ];

  /* ── sidebar: counts by status ──────────────────────────────────────────── */

  const sidebar = (
    <Card>
      <CardHeader>
        <CardTitle>{t('sidebar.title', { defaultValue: 'Cases by status' })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {CASE_STATUSES.map((status) => (
              <Skeleton key={status} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <>
            {CASE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-accent/60 ${
                  statusFilter === status ? 'bg-accent' : ''
                }`}
              >
                <Badge variant={CASE_STATUS_VARIANT[status]} appearance="light" size="sm">
                  {statusText(status)}
                </Badge>
                <span className="text-sm font-semibold tabular-nums">
                  {counts.byStatus[status]}
                </span>
              </button>
            ))}

            <Separator />

            <div className="flex items-center justify-between gap-3 px-2 text-sm">
              <span className="text-muted-foreground">
                {t('sidebar.total', { defaultValue: 'Total cases' })}
              </span>
              <span className="font-semibold tabular-nums">{counts.total}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <UserRoundX className="size-3.5" />
                {t('sidebar.unassigned', { defaultValue: 'Unassigned' })}
              </span>
              <span className="font-semibold tabular-nums">{counts.unassigned}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                {t('sidebar.overdue', { defaultValue: 'Past SLA' })}
              </span>
              <span className="font-semibold tabular-nums text-destructive">
                {counts.overdue}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <SectionShellWithSidebar
      title={t('toolbar.title', { defaultValue: 'Manual resolution' })}
      description={t('toolbar.description', {
        defaultValue:
          'Work queue for cases that need a human decision. Every case carries a 2-business-hour SLA clock.',
      })}
      sidebar={sidebar}
    >
      {error ? (
        <Alert variant="destructive" icon="destructive" appearance="light">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('error', { defaultValue: 'Could not load the resolution queue.' })}
          </AlertTitle>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('tiles.title', { defaultValue: 'Queue at a glance' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile) => (
                <Skeleton key={tile.key} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile) => (
                <Tile key={tile.key} tile={tile} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle>{t('table.title', { defaultValue: 'Cases' })}</CardTitle>
          <CardToolbar className="flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="spm-resolution-status" className="text-xs text-muted-foreground">
                {t('filters.status', { defaultValue: 'Status' })}
              </Label>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger id="spm-resolution-status" className="w-44">
                  <SelectValue
                    placeholder={t('filters.all', { defaultValue: 'All statuses' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('filters.all', { defaultValue: 'All statuses' })}
                  </SelectItem>
                  {CASE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusText(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="spm-resolution-unassigned"
                size="sm"
                checked={unassignedOnly}
                onCheckedChange={setUnassignedOnly}
              />
              <Label
                htmlFor="spm-resolution-unassigned"
                className="text-xs text-muted-foreground"
              >
                {t('filters.unassignedOnly', { defaultValue: 'Unassigned only' })}
              </Label>
            </div>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            {t('filters.showing', {
              defaultValue: 'Showing {{shown}} of {{total}} cases',
              shown: filtered.length,
              total: counts.total,
            })}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.caseNumber', { defaultValue: 'Case no.' })}</TableHead>
                  <TableHead>{t('table.caseTitle', { defaultValue: 'Title' })}</TableHead>
                  <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead>{t('table.source', { defaultValue: 'Source' })}</TableHead>
                  <TableHead>{t('table.assignedTo', { defaultValue: 'Assigned to' })}</TableHead>
                  <TableHead>{t('table.openedAt', { defaultValue: 'Opened at' })}</TableHead>
                  <TableHead>{t('table.sla', { defaultValue: 'SLA' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3].map((row) => (
                    <TableRow key={row}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {t('table.empty', { defaultValue: 'No cases match these filters.' })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const sla = slaFor(item);
                    const isSelected = item.id === selectedId;
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {item.caseNumber}
                        </TableCell>
                        <TableCell className="max-w-[22rem] font-medium">{item.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={CASE_STATUS_VARIANT[item.status]}
                            appearance="light"
                            size="sm"
                          >
                            {statusText(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {sourceText(item.sourceType)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {item.assignedTo ? (
                            <span className="font-mono">{item.assignedTo}</span>
                          ) : (
                            <span className="text-muted-foreground">{unassignedText}</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(item.openedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={SLA_VARIANT[sla.tone]} appearance="light" size="sm">
                            <Clock />
                            {slaText(sla)}
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

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.title', { defaultValue: 'Case detail' })}</CardTitle>
          {selected ? (
            <CardToolbar>
              <Badge
                variant={CASE_STATUS_VARIANT[selected.status]}
                appearance="light"
                size="sm"
              >
                {statusText(selected.status)}
              </Badge>
              <Badge variant={SLA_VARIANT[slaFor(selected).tone]} appearance="light" size="sm">
                {slaText(slaFor(selected))}
              </Badge>
            </CardToolbar>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !selected ? (
            <div className="py-10 text-center text-muted-foreground">
              {t('detail.placeholder', {
                defaultValue: 'Select a case from the list above to see its detail.',
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="font-mono text-xs text-muted-foreground">
                  {selected.caseNumber}
                </div>
                <h4 className="mt-1 text-base font-semibold">{selected.title}</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('detail.source', { defaultValue: 'Source' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <CircleDot className="size-3.5 text-muted-foreground" />
                    {sourceText(selected.sourceType)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('detail.assignee', { defaultValue: 'Assignee' })}
                  </span>
                  <span className="text-sm">
                    {selected.assignedTo ? (
                      <span className="font-mono">{selected.assignedTo}</span>
                    ) : (
                      <span className="text-muted-foreground">{unassignedText}</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('detail.openedAt', { defaultValue: 'Opened at' })}
                  </span>
                  <span className="text-sm">{formatDateTime(selected.openedAt)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('detail.dueAt', { defaultValue: 'Due at (SLA)' })}
                  </span>
                  <span className="text-sm">{formatDateTime(selected.dueAt)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('detail.resolvedAt', { defaultValue: 'Resolved at' })}
                  </span>
                  <span className="text-sm">{formatDateTime(selected.resolvedAt)}</span>
                </div>
              </div>

              <Separator />

              <div>
                <h5 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  {t('detail.notes', { defaultValue: 'Notes' })}
                </h5>
                {notes.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {t('detail.noNotes', { defaultValue: 'No notes recorded on this case yet.' })}
                  </div>
                ) : (
                  <ol className="space-y-4 border-s border-border ps-4">
                    {notes.map((note) => (
                      <li key={note.id} className="relative">
                        <span className="absolute -start-[1.3rem] top-1.5 size-2 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-medium">{note.actor}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(note.occurredAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">{note.text}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShellWithSidebar>
  );
}
