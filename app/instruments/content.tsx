'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CalendarCheck,
  CalendarRange,
  CalendarX,
  CircleAlert,
  Clock,
  Coins,
  Hash,
  Layers,
  Search,
  Timer,
} from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useTranslation } from '@/hooks/useTranslation';
import {
  formatAmount,
  formatAmountCompact,
  formatDate,
  formatUnits,
  type BadgeVariant,
} from '../components/format';
// The single permitted import from mock-data: a fixed "now" reference. A live
// `new Date()` during render would desynchronise the server and client HTML.
import { MOCK_TODAY } from '../components/mock-data';
import { SectionShell } from '../components/section-shell';
import { getInstruments } from '../components/spm-api';
import type { Instrument, InstrumentRule } from '../components/types';

/* ── local view model ─────────────────────────────────────────────────────── */

type StatusFilter = 'all' | 'active' | 'inactive';

/** Where the rule's validity window sits relative to today. */
type RuleWindow = 'scheduled' | 'inEffect' | 'ended';

const RULE_WINDOW_VARIANT: Record<RuleWindow, BadgeVariant> = {
  scheduled: 'warning',
  inEffect: 'success',
  ended: 'secondary',
};

const NOW_MS = Date.parse(MOCK_TODAY);

function ruleWindow(rule: InstrumentRule): RuleWindow {
  if (Date.parse(rule.effectiveFrom) > NOW_MS) return 'scheduled';
  if (rule.effectiveTo !== null && Date.parse(rule.effectiveTo) < NOW_MS) return 'ended';
  return 'inEffect';
}

/** `FixedIncomeEtf` → `Fixed Income Etf`. Used only as the i18n fallback. */
function humanizeType(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/* ── small presentational pieces ──────────────────────────────────────────── */

interface FactTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}

function FactTile({ icon, label, value, hint }: FactTileProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold text-foreground">
        <span dir="ltr" className="inline-block">
          {value}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

interface RuleItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}

function RuleItem({ icon, label, value, hint }: RuleItemProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3.5">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="mt-1.5 text-sm font-semibold text-foreground">
        <span dir="ltr" className="inline-block">
          {value}
        </span>
      </dd>
      <dd className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</dd>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */

export function InstrumentsContent() {
  const { t } = useTranslation('spm-instruments');

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getInstruments()
      .then((rows) => {
        if (cancelled) return;
        setInstruments(rows);
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

  /** Active instruments first, then alphabetically by symbol. */
  const ordered = useMemo(() => {
    return [...instruments].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [instruments]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return ordered.filter((instrument) => {
      if (status === 'active' && !instrument.isActive) return false;
      if (status === 'inactive' && instrument.isActive) return false;
      if (!needle) return true;
      return (
        instrument.symbol.toLowerCase().includes(needle) ||
        instrument.nameFa.toLowerCase().includes(needle) ||
        instrument.nameEn.toLowerCase().includes(needle) ||
        instrument.instrumentType.toLowerCase().includes(needle)
      );
    });
  }, [ordered, search, status]);

  /** Combined limits across the ACTIVE catalog — what may be accepted today. */
  const summary = useMemo(() => {
    const active = instruments.filter((i) => i.isActive);
    if (active.length === 0) {
      return {
        activeCount: 0,
        totalCount: instruments.length,
        lowestMin: null as number | null,
        highestMax: null as number | null,
        earliestCutOff: null as string | null,
      };
    }
    return {
      activeCount: active.length,
      totalCount: instruments.length,
      lowestMin: Math.min(...active.map((i) => i.rule.minAmount)) as number | null,
      highestMax: Math.max(...active.map((i) => i.rule.maxAmount)) as number | null,
      earliestCutOff: [...active.map((i) => i.rule.cutOffTime)].sort((a, b) =>
        a.localeCompare(b),
      )[0] as string | null,
    };
  }, [instruments]);

  const windowLabel: Record<RuleWindow, string> = {
    scheduled: t('window.scheduled', { defaultValue: 'Not yet effective' }),
    inEffect: t('window.inEffect', { defaultValue: 'Rule in effect' }),
    ended: t('window.ended', { defaultValue: 'Rule expired' }),
  };

  const title = t('pageTitle', { defaultValue: 'Instruments' });
  const description = t('toolbar.description', {
    defaultValue:
      'The tradable instrument catalog and the limits each one enforces on investor orders.',
  });

  // A failed catalog load must not be dressed up as an empty catalog — an
  // operator would read "no active instrument" as a business fact.
  if (error !== null) {
    return (
      <SectionShell title={title} description={description}>
        <Alert variant="destructive">
          <AlertIcon>
            <CircleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('errors.loadFailed', {
              defaultValue: 'The instrument catalog could not be loaded.',
            })}
          </AlertTitle>
        </Alert>
      </SectionShell>
    );
  }

  return (
    <SectionShell title={title} description={description}>
      {/* ── summary: what the active catalog allows today ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('summary.title', { defaultValue: 'Catalog at a glance' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FactTile
                  icon={<Layers className="size-4" />}
                  label={t('summary.activeInstruments', { defaultValue: 'Active instruments' })}
                  value={String(summary.activeCount)}
                  hint={t('summary.activeOfTotal', {
                    defaultValue: 'of {{total}} in the catalog',
                    total: summary.totalCount,
                  })}
                />
                <FactTile
                  icon={<ArrowDownToLine className="size-4" />}
                  label={t('summary.lowestMin', { defaultValue: 'Lowest minimum amount' })}
                  value={formatAmount(summary.lowestMin)}
                  hint={t('summary.lowestMinHint', {
                    defaultValue: 'IRR — the smallest order the catalog accepts',
                  })}
                />
                <FactTile
                  icon={<ArrowUpToLine className="size-4" />}
                  label={t('summary.highestMax', { defaultValue: 'Highest maximum amount' })}
                  value={formatAmount(summary.highestMax)}
                  hint={t('summary.highestMaxHint', {
                    defaultValue: 'IRR — the largest order the catalog accepts',
                  })}
                />
                <FactTile
                  icon={<Clock className="size-4" />}
                  label={t('summary.earliestCutOff', { defaultValue: 'Earliest cut-off' })}
                  value={summary.earliestCutOff ?? '—'}
                  hint={t('summary.earliestCutOffHint', {
                    defaultValue: 'First daily deadline across active instruments',
                  })}
                />
              </div>

              <Separator className="my-5" />

              <p className="text-sm text-muted-foreground">
                {summary.activeCount > 0
                  ? t('summary.combinedRange', {
                      defaultValue:
                        'Across active instruments an order may be between {{min}} and {{max}} IRR.',
                      min: formatAmountCompact(summary.lowestMin),
                      max: formatAmountCompact(summary.highestMax),
                    })
                  : t('summary.noActive', {
                      defaultValue:
                        'No instrument is active — no new investment order can be accepted.',
                    })}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── filters ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters.title', { defaultValue: 'Find an instrument' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="spm-instrument-search">
                {t('filters.searchLabel', { defaultValue: 'Search' })}
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="spm-instrument-search"
                  className="ps-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('filters.searchPlaceholder', {
                    defaultValue: 'Symbol, name or instrument type…',
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spm-instrument-status">
                {t('filters.statusLabel', { defaultValue: 'Status' })}
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger id="spm-instrument-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('filters.all', { defaultValue: 'All instruments' })}
                  </SelectItem>
                  <SelectItem value="active">
                    {t('filters.activeOnly', { defaultValue: 'Active only' })}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t('filters.inactiveOnly', { defaultValue: 'Inactive only' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── one card per instrument, active first ── */}
      {loading ? (
        <>
          <LoadingCard />
          <LoadingCard />
        </>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('empty.noInstruments', {
              defaultValue: 'No instrument matches the current filters.',
            })}
          </CardContent>
        </Card>
      ) : (
        filtered.map((instrument) => {
          const win = ruleWindow(instrument.rule);
          return (
            <Card key={instrument.id} className={instrument.isActive ? undefined : 'opacity-60'}>
              <CardHeader className="py-4">
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="flex flex-wrap items-baseline gap-2 text-base">
                    <span className="font-mono text-lg font-bold">{instrument.symbol}</span>
                    <span className="font-semibold">{instrument.nameFa}</span>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{instrument.nameEn}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={instrument.isActive ? 'success' : 'secondary'} size="lg">
                    {instrument.isActive
                      ? t('status.active', { defaultValue: 'Active' })
                      : t('status.inactive', { defaultValue: 'Inactive' })}
                  </Badge>
                  <Badge variant={RULE_WINDOW_VARIANT[win]} appearance="light" size="lg">
                    {windowLabel[win]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FactTile
                    icon={<Coins className="size-4" />}
                    label={t('instrument.nav', { defaultValue: 'NAV per unit' })}
                    value={formatAmount(instrument.navPerUnit)}
                    hint={t('instrument.navHint', {
                      defaultValue: 'IRR per unit — the price the order is struck at',
                    })}
                  />
                  <FactTile
                    icon={<Layers className="size-4" />}
                    label={t('instrument.type', { defaultValue: 'Instrument type' })}
                    value={t(`types.${instrument.instrumentType}`, {
                      defaultValue: humanizeType(instrument.instrumentType),
                    })}
                    hint={t('instrument.typeHint', {
                      defaultValue: 'Determines which order rules apply',
                    })}
                  />
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">
                    {t('rule.title', { defaultValue: 'Order rules and limits' })}
                  </h4>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <RuleItem
                      icon={<ArrowDownToLine className="size-3.5" />}
                      label={t('rule.minAmount', { defaultValue: 'Minimum amount' })}
                      value={formatAmount(instrument.rule.minAmount)}
                      hint={t('rule.minAmountHint', {
                        defaultValue: 'IRR — a smaller order is rejected',
                      })}
                    />
                    <RuleItem
                      icon={<ArrowUpToLine className="size-3.5" />}
                      label={t('rule.maxAmount', { defaultValue: 'Maximum amount' })}
                      value={formatAmount(instrument.rule.maxAmount)}
                      hint={t('rule.maxAmountHint', {
                        defaultValue: 'IRR — a larger order is rejected',
                      })}
                    />
                    <RuleItem
                      icon={<Hash className="size-3.5" />}
                      label={t('rule.minUnits', { defaultValue: 'Minimum units' })}
                      value={formatUnits(instrument.rule.minUnits)}
                      hint={t('rule.minUnitsHint', {
                        defaultValue: 'Smallest unit quantity per order',
                      })}
                    />
                    <RuleItem
                      icon={<Clock className="size-3.5" />}
                      label={t('rule.cutOff', { defaultValue: 'Cut-off time' })}
                      value={instrument.rule.cutOffTime}
                      hint={t('rule.cutOffHint', {
                        defaultValue: 'Orders after this roll to the next trading day',
                      })}
                    />
                    <RuleItem
                      icon={<Timer className="size-3.5" />}
                      label={t('rule.settlement', { defaultValue: 'Settlement' })}
                      value={`T+${instrument.rule.settlementDays}`}
                      hint={t('rule.settlementHint', {
                        defaultValue: '{{days}} business day(s) after the trade date',
                        days: instrument.rule.settlementDays,
                      })}
                    />
                    <RuleItem
                      icon={<CalendarCheck className="size-3.5" />}
                      label={t('rule.effectiveFrom', { defaultValue: 'Effective from' })}
                      value={formatDate(instrument.rule.effectiveFrom)}
                      hint={t('rule.effectiveFromHint', {
                        defaultValue: 'First day this rule applies',
                      })}
                    />
                    <RuleItem
                      icon={
                        instrument.rule.effectiveTo === null ? (
                          <CalendarRange className="size-3.5" />
                        ) : (
                          <CalendarX className="size-3.5" />
                        )
                      }
                      label={t('rule.effectiveTo', { defaultValue: 'Effective to' })}
                      value={
                        instrument.rule.effectiveTo === null
                          ? t('rule.openEnded', { defaultValue: 'Open ended' })
                          : formatDate(instrument.rule.effectiveTo)
                      }
                      hint={
                        instrument.rule.effectiveTo === null
                          ? t('rule.openEndedHint', {
                              defaultValue: 'No end date — applies until withdrawn',
                            })
                          : t('rule.effectiveToHint', {
                              defaultValue: 'Last day this rule applies',
                            })
                      }
                    />
                    <RuleItem
                      icon={<CalendarRange className="size-3.5" />}
                      label={t('rule.windowState', { defaultValue: 'Rule window' })}
                      value={windowLabel[win]}
                      hint={t('rule.windowStateHint', {
                        defaultValue: 'Checked against today, {{today}}',
                        today: formatDate(MOCK_TODAY),
                      })}
                    />
                  </dl>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </SectionShell>
  );
}
