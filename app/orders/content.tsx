'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CircleX, ClipboardList, Hourglass, Search, SplitSquareHorizontal, TriangleAlert } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionShell } from '../components/section-shell';
import { getLookupMaps, getOrders } from '../components/spm-api';
import {
  ORDER_STATUS_VARIANT,
  fillPercent,
  formatAmount,
  formatDateTime,
  formatUnits,
} from '../components/format';
import type { Guid, Instrument, InvestmentOrder, InvestmentRequest, InvestorAccount, OrderStatus } from '../components/types';

/** The board buckets. `all` is the unfiltered view; the rest map 1:1 to OrderStatus. */
const TAB_KEYS = ['all', 'Pending', 'AwaitingResponse', 'Partial', 'Executed', 'Failed'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABEL_DEFAULT: Record<TabKey, string> = {
  all: 'All',
  Pending: 'Pending',
  AwaitingResponse: 'Awaiting response',
  Partial: 'Partially filled',
  Executed: 'Executed',
  Failed: 'Failed',
};

const ORDER_STATUS_LABEL_DEFAULT: Record<OrderStatus, string> = {
  Pending: 'Pending',
  AwaitingResponse: 'Awaiting response',
  Partial: 'Partially filled',
  Executed: 'Executed',
  Cancelled: 'Cancelled',
  Failed: 'Failed',
};

interface LookupMaps {
  accounts: Record<Guid, InvestorAccount>;
  instruments: Record<Guid, Instrument>;
  requests: Record<Guid, InvestmentRequest>;
}

interface SummaryTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  tone: string;
}

function SummaryTile({ icon, label, value, tone }: SummaryTileProps) {
  return (
    <Card>
      <CardContent className="py-5 flex items-center gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold leading-none">{value.toLocaleString('en-US')}</span>
          <span className="text-sm text-muted-foreground mt-1">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersContent() {
  const { t } = useTranslation('spm-orders');

  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [lookups, setLookups] = useState<LookupMaps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([getOrders(), getLookupMaps()])
      .then(([orderRows, maps]) => {
        if (cancelled) return;
        setOrders(orderRows);
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

  const counts = useMemo(() => {
    const base: Record<TabKey, number> = {
      all: orders.length,
      Pending: 0,
      AwaitingResponse: 0,
      Partial: 0,
      Executed: 0,
      Failed: 0,
    };
    orders.forEach((o) => {
      if (o.status !== 'Cancelled') base[o.status] += 1;
    });
    return base;
  }, [orders]);

  const requestNumberOf = useMemo(() => {
    return (order: InvestmentOrder): string | null =>
      lookups?.requests[order.requestId]?.requestNumber ?? null;
  }, [lookups]);

  const symbolOf = useMemo(() => {
    return (order: InvestmentOrder): string | null =>
      lookups?.instruments[order.instrumentId]?.symbol ?? null;
  }, [lookups]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((o) => {
      if (tab !== 'all' && o.status !== tab) return false;
      if (!term) return true;

      const haystack = [o.omsOrderRef, requestNumberOf(o), symbolOf(o)]
        .filter((v): v is string => Boolean(v))
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [orders, tab, search, requestNumberOf, symbolOf]);

  const columnCount = 10;

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Order tracking' })}
      description={t('toolbar.description', {
        defaultValue: 'Every order sent to the OMS, grouped by where it is in its lifecycle.',
      })}
    >
      {error ? (
        <Alert variant="destructive" appearance="light" icon="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('errors.loadFailed', { defaultValue: 'Could not load orders.' })} {error}
          </AlertTitle>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
        <SummaryTile
          icon={<ClipboardList className="size-5 text-blue-600 dark:text-blue-400" />}
          label={t('summary.total', { defaultValue: 'Total orders' })}
          value={counts.all}
          tone="bg-blue-100 dark:bg-blue-950"
        />
        <SummaryTile
          icon={<Hourglass className="size-5 text-amber-600 dark:text-amber-400" />}
          label={t('summary.awaiting', { defaultValue: 'Awaiting OMS response' })}
          value={counts.AwaitingResponse}
          tone="bg-amber-100 dark:bg-amber-950"
        />
        <SummaryTile
          icon={<SplitSquareHorizontal className="size-5 text-violet-600 dark:text-violet-400" />}
          label={t('summary.partial', { defaultValue: 'Partially filled' })}
          value={counts.Partial}
          tone="bg-violet-100 dark:bg-violet-950"
        />
        <SummaryTile
          icon={<CircleX className="size-5 text-rose-600 dark:text-rose-400" />}
          label={t('summary.failed', { defaultValue: 'Failed' })}
          value={counts.Failed}
          tone="bg-rose-100 dark:bg-rose-950"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('board.title', { defaultValue: 'Order board' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <Tabs value={tab} onValueChange={(value: string) => setTab(value as TabKey)}>
              <TabsList variant="button" size="sm" className="flex-wrap">
                {TAB_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {t(`tabs.${key}`, { defaultValue: TAB_LABEL_DEFAULT[key] })}
                    <span className="ms-1.5 text-muted-foreground">({counts[key].toLocaleString('en-US')})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
                placeholder={t('filters.searchPlaceholder', {
                  defaultValue: 'Search OMS ref, request number or symbol',
                })}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.omsRef', { defaultValue: 'OMS ref' })}</TableHead>
                  <TableHead>{t('table.requestNumber', { defaultValue: 'Request' })}</TableHead>
                  <TableHead>{t('table.symbol', { defaultValue: 'Symbol' })}</TableHead>
                  <TableHead>{t('table.side', { defaultValue: 'Side' })}</TableHead>
                  <TableHead className="text-end">{t('table.quantity', { defaultValue: 'Quantity' })}</TableHead>
                  <TableHead>{t('table.filled', { defaultValue: 'Filled' })}</TableHead>
                  <TableHead className="text-end">{t('table.price', { defaultValue: 'Price' })}</TableHead>
                  <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead>{t('table.placedAt', { defaultValue: 'Placed at' })}</TableHead>
                  <TableHead>{t('table.lastPolledAt', { defaultValue: 'Last polled' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3, 4].map((row) => (
                    <TableRow key={`skeleton-${row}`}>
                      <TableCell colSpan={columnCount}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                      {t('table.empty', { defaultValue: 'No orders match this filter.' })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((order) => {
                    const percent = fillPercent(order.filledQuantity, order.quantity);
                    const requestNumber = requestNumberOf(order);
                    const symbol = symbolOf(order);

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {order.omsOrderRef ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            href={`/requests/${order.requestId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {requestNumber ?? t('table.viewRequest', { defaultValue: 'View request' })}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{symbol ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={order.side === 'Buy' ? 'primary' : 'secondary'}>
                            {t(`side.${order.side}`, { defaultValue: order.side })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end whitespace-nowrap">
                          {formatUnits(order.quantity)}
                        </TableCell>
                        <TableCell className="min-w-40">
                          <Progress value={percent} className="h-1.5" />
                          <span className="mt-1.5 block text-xs text-muted-foreground whitespace-nowrap">
                            {`${formatUnits(order.filledQuantity)} / ${formatUnits(order.quantity)} (${percent}%)`}
                          </span>
                        </TableCell>
                        <TableCell className="text-end whitespace-nowrap">
                          {formatAmount(order.price)}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                            {t(`status.${order.status}`, {
                              defaultValue: ORDER_STATUS_LABEL_DEFAULT[order.status],
                            })}
                          </Badge>
                          {order.status === 'Failed' && order.failureReason ? (
                            <p className="mt-1.5 max-w-56 text-xs text-rose-600 dark:text-rose-400">
                              {order.failureReason}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(order.placedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(order.lastPolledAt)}
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
