'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Search, TriangleAlert, X } from 'lucide-react';

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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/useTranslation';

import { formatDateTime, type BadgeVariant } from '../components/format';
import { SectionShell } from '../components/section-shell';
import { getAuditEntries } from '../components/spm-api';
import type { AuditAction, AuditEntry } from '../components/types';

/**
 * SPM — audit trail.
 *
 * The contractual requirement for this screen is that every entry carries BOTH
 * states: expanding a row shows a field-by-field BEFORE / AFTER diff built from
 * the union of the keys held by the two objects, so an auditor can see exactly
 * what the row looked like before the change and after it.
 */

/** format.ts has no audit map — the variants below are the ones this screen specifies. */
const ACTION_VARIANT: Record<AuditAction, BadgeVariant> = {
  Created: 'success',
  Updated: 'primary',
  Deleted: 'destructive',
  StatusChanged: 'warning',
  Approved: 'success',
  Rejected: 'destructive',
};

/** English fallbacks; the fa/en JSON files carry the real labels. */
const ACTION_LABEL: Record<AuditAction, string> = {
  Created: 'Created',
  Updated: 'Updated',
  Deleted: 'Deleted',
  StatusChanged: 'Status changed',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

/** Sentinel for "no filter" — a Radix Select item may not carry an empty value. */
const ALL = 'all';

const ISO_LIKE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const BEFORE_CHANGED_CELL = 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100';
const AFTER_CHANGED_CELL =
  'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100';

interface DiffRow {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Union of the keys of the two states, in before-then-after order. */
function buildDiff(entry: AuditEntry): DiffRow[] {
  const keys: string[] = [];
  for (const key of Object.keys(entry.before ?? {})) {
    if (!keys.includes(key)) keys.push(key);
  }
  for (const key of Object.keys(entry.after ?? {})) {
    if (!keys.includes(key)) keys.push(key);
  }

  return keys.map((key) => {
    const before = entry.before ? entry.before[key] : undefined;
    const after = entry.after ? entry.after[key] : undefined;
    return { key, before, after, changed: !sameValue(before, after) };
  });
}

function shortenId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function searchBlob(entry: AuditEntry): string {
  return [
    entry.entityName,
    entry.entityId,
    entry.action,
    entry.actor,
    entry.occurredAt,
    JSON.stringify(entry.before ?? {}),
    JSON.stringify(entry.after ?? {}),
  ]
    .join(' ')
    .toLowerCase();
}

export function AuditContent() {
  const { t } = useTranslation('spm-audit');

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [search, setSearch] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [actorFilter, setActorFilter] = useState<string>(ALL);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAuditEntries()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const entityOptions = useMemo<string[]>(
    () => Array.from(new Set(entries.map((e) => e.entityName))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const actionOptions = useMemo<AuditAction[]>(
    () => Array.from(new Set(entries.map((e) => e.action))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const actorOptions = useMemo<string[]>(
    () => Array.from(new Set(entries.map((e) => e.actor))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const filtered = useMemo<AuditEntry[]>(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entityFilter !== ALL && entry.entityName !== entityFilter) return false;
      if (actionFilter !== ALL && entry.action !== actionFilter) return false;
      if (actorFilter !== ALL && entry.actor !== actorFilter) return false;
      if (needle.length > 0 && !searchBlob(entry).includes(needle)) return false;
      return true;
    });
  }, [entries, entityFilter, actionFilter, actorFilter, search]);

  const filtersActive =
    search.trim().length > 0 ||
    entityFilter !== ALL ||
    actionFilter !== ALL ||
    actorFilter !== ALL;

  const allExpanded = filtered.length > 0 && filtered.every((entry) => expanded.includes(entry.id));

  const resetFilters = () => {
    setSearch('');
    setEntityFilter(ALL);
    setActionFilter(ALL);
    setActorFilter(ALL);
  };

  const toggleRow = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setExpanded(allExpanded ? [] : filtered.map((entry) => entry.id));
  };

  /** Renders one recorded field value. Never locale-dependent — SSR safe. */
  const renderValue = (value: unknown): string => {
    if (value === undefined) return t('diff.absent', { defaultValue: '—' });
    if (value === null) return t('diff.nullValue', { defaultValue: 'null' });
    if (typeof value === 'boolean') {
      return value
        ? t('diff.trueValue', { defaultValue: 'true' })
        : t('diff.falseValue', { defaultValue: 'false' });
    }
    if (typeof value === 'number') return value.toLocaleString('en-US');
    if (typeof value === 'string') {
      if (value.length === 0) return t('diff.emptyValue', { defaultValue: '(empty)' });
      return ISO_LIKE.test(value) ? formatDateTime(value) : value;
    }
    return JSON.stringify(value);
  };

  const columnCount = 6;

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Audit trail' })}
      description={t('toolbar.description', {
        defaultValue:
          'Append-only record of every change, with the full state before and after each one.',
      })}
      actions={
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
          <RotateCcw />
          {t('actions.refresh', { defaultValue: 'Refresh' })}
        </Button>
      }
    >
      {error !== null && (
        <Alert variant="destructive" icon="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('error.title', { defaultValue: 'The audit trail could not be loaded.' })}
          </AlertTitle>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('filters.title', { defaultValue: 'Filters' })}</CardTitle>
          <CardToolbar>
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!filtersActive}>
              <X />
              {t('actions.reset', { defaultValue: 'Reset filters' })}
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="spm-audit-search">
                {t('filters.search', { defaultValue: 'Search' })}
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="spm-audit-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filters.searchPlaceholder', {
                    defaultValue: 'Entity, id, actor or a changed value…',
                  })}
                  className="ps-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('filters.entity', { defaultValue: 'Entity' })}</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('filters.allEntities', { defaultValue: 'All entities' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('filters.allEntities', { defaultValue: 'All entities' })}
                  </SelectItem>
                  {entityOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {t(`entity.${name}`, { defaultValue: name })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('filters.action', { defaultValue: 'Action' })}</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('filters.allActions', { defaultValue: 'All actions' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('filters.allActions', { defaultValue: 'All actions' })}
                  </SelectItem>
                  {actionOptions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {t(`action.${action}`, { defaultValue: ACTION_LABEL[action] })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('filters.actor', { defaultValue: 'Actor' })}</Label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('filters.allActors', { defaultValue: 'All actors' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('filters.allActors', { defaultValue: 'All actors' })}
                  </SelectItem>
                  {actorOptions.map((actor) => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('table.title', { defaultValue: 'Audit entries' })}</CardTitle>
          <CardToolbar>
            <span className="text-xs text-muted-foreground">
              {t('table.summary', {
                defaultValue: 'Showing {{shown}} of {{total}}',
                shown: filtered.length,
                total: entries.length,
              })}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
              {allExpanded
                ? t('actions.collapseAll', { defaultValue: 'Collapse all' })
                : t('actions.expandAll', { defaultValue: 'Expand all' })}
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">
                      {t('table.toggle', { defaultValue: 'Toggle before/after details' })}
                    </span>
                  </TableHead>
                  <TableHead>{t('table.occurredAt', { defaultValue: 'Occurred at' })}</TableHead>
                  <TableHead>{t('table.entity', { defaultValue: 'Entity' })}</TableHead>
                  <TableHead>{t('table.entityId', { defaultValue: 'Entity ID' })}</TableHead>
                  <TableHead>{t('table.action', { defaultValue: 'Action' })}</TableHead>
                  <TableHead>{t('table.actor', { defaultValue: 'Actor' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  [0, 1, 2, 3, 4].map((row) => (
                    <TableRow key={`skeleton-${row}`}>
                      <TableCell>
                        <Skeleton className="size-5" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="py-10 text-center text-muted-foreground">
                      {entries.length === 0
                        ? t('table.emptySource', { defaultValue: 'No audit entries have been recorded yet.' })
                        : t('table.emptyFiltered', {
                            defaultValue: 'No audit entry matches the current filters.',
                          })}
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  filtered.map((entry) => {
                    const isOpen = expanded.includes(entry.id);
                    const diff = buildDiff(entry);
                    const changedCount = diff.filter((row) => row.changed).length;
                    const wasCreated = entry.before === null;
                    const wasDeleted = entry.after === null;

                    return (
                      <Fragment key={entry.id}>
                        <TableRow className={isOpen ? 'bg-muted/40' : undefined}>
                          <TableCell className="w-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-expanded={isOpen}
                              aria-label={t('table.toggle', {
                                defaultValue: 'Toggle before/after details',
                              })}
                              onClick={() => toggleRow(entry.id)}
                            >
                              {isOpen ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4 rtl:rotate-180" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {formatDateTime(entry.occurredAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {t(`entity.${entry.entityName}`, { defaultValue: entry.entityName })}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help font-mono text-xs text-muted-foreground">
                                  {shortenId(entry.entityId)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="font-mono">{entry.entityId}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ACTION_VARIANT[entry.action]}>
                              {t(`action.${entry.action}`, { defaultValue: ACTION_LABEL[entry.action] })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.actor}</TableCell>
                        </TableRow>

                        {isOpen && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={columnCount} className="p-0">
                              <div className="px-4 pb-4 pt-2">
                                <div className="rounded-lg border border-border bg-background/70">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t('diff.title', { defaultValue: 'Before / after' })}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {t('diff.changedCount', {
                                        defaultValue: '{{changed}} of {{total}} fields changed',
                                        changed: changedCount,
                                        total: diff.length,
                                      })}
                                    </span>
                                  </div>

                                  {diff.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-muted-foreground">
                                      {t('diff.noFields', {
                                        defaultValue: 'No field-level state was recorded for this entry.',
                                      })}
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <div className="grid min-w-[34rem] grid-cols-[minmax(8rem,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)]">
                                        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                          {t('diff.field', { defaultValue: 'Field' })}
                                        </div>
                                        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                          {t('diff.before', { defaultValue: 'Before' })}
                                        </div>
                                        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                          {t('diff.after', { defaultValue: 'After' })}
                                        </div>

                                        {diff.map((row, index) => {
                                          const edge =
                                            index === diff.length - 1 ? '' : ' border-b border-border';
                                          const beforeTone = wasCreated
                                            ? ' italic text-muted-foreground'
                                            : row.changed
                                              ? ` ${BEFORE_CHANGED_CELL}`
                                              : ' text-muted-foreground';
                                          const afterTone = wasDeleted
                                            ? ' italic text-muted-foreground'
                                            : row.changed
                                              ? ` ${AFTER_CHANGED_CELL}`
                                              : ' text-muted-foreground';

                                          return (
                                            <Fragment key={row.key}>
                                              <div
                                                className={`px-3 py-2 text-sm font-medium${edge}`}
                                              >
                                                {t(`field.${row.key}`, { defaultValue: row.key })}
                                              </div>
                                              <div
                                                className={`break-words px-3 py-2 font-mono text-xs${edge}${beforeTone}`}
                                              >
                                                {wasCreated
                                                  ? t('diff.created', { defaultValue: '— (created)' })
                                                  : renderValue(row.before)}
                                              </div>
                                              <div
                                                className={`break-words px-3 py-2 font-mono text-xs${edge}${afterTone}`}
                                              >
                                                {wasDeleted
                                                  ? t('diff.deleted', { defaultValue: '— (deleted)' })
                                                  : renderValue(row.after)}
                                              </div>
                                            </Fragment>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
