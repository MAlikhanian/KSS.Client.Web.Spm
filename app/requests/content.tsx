'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Inbox, Search, TriangleAlert, X } from 'lucide-react';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  formatAmount,
  formatDate,
  formatUnits,
  REQUEST_STATUS_VARIANT,
  type BadgeVariant,
} from '../components/format';
import { getLookupMaps, getRequests } from '../components/spm-api';
import type {
  Guid,
  Instrument,
  InvestmentRequest,
  InvestorAccount,
  RequestStatus,
  RequestType,
} from '../components/types';

/** Every status, in workflow order — drives the status filter. */
const REQUEST_STATUSES: RequestStatus[] = [
  'Draft',
  'Submitted',
  'Validated',
  'AwaitingPayment',
  'Paid',
  'OrderPlaced',
  'PartiallyFilled',
  'Filled',
  'Settled',
  'Rejected',
  'Failed',
  'Cancelled',
];

/** Still moving through the pipeline — i.e. an operator may still have to act. */
const OPEN_STATUSES: RequestStatus[] = [
  'Draft',
  'Submitted',
  'Validated',
  'AwaitingPayment',
  'Paid',
  'OrderPlaced',
  'PartiallyFilled',
  'Filled',
];

const REQUEST_TYPES: RequestType[] = ['Deposit', 'Withdrawal'];

const REQUEST_TYPE_VARIANT: Record<RequestType, BadgeVariant> = {
  Deposit: 'success',
  Withdrawal: 'warning',
};

const ALL = 'all';

interface SummaryTile {
  key: string;
  label: string;
  hint: string;
  value: number;
  tone: string;
}

export function RequestsContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [accounts, setAccounts] = useState<Record<Guid, InvestorAccount>>({});
  const [instruments, setInstruments] = useState<Record<Guid, Instrument>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getRequests(), getLookupMaps()])
      .then(([rows, maps]) => {
        if (cancelled) return;
        setRequests(rows);
        setAccounts(maps.accounts);
        setInstruments(maps.instruments);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const investorName = (accountId: Guid): string => {
    const account = accounts[accountId];
    if (!account) return '—';
    return isFa ? account.fullNameFa : account.fullNameEn;
  };

  const instrumentSymbol = (instrumentId: Guid): string =>
    instruments[instrumentId]?.symbol ?? '—';

  const filtered = useMemo<InvestmentRequest[]>(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((row) => {
      if (typeFilter !== ALL && row.requestType !== typeFilter) return false;
      if (statusFilter !== ALL && row.status !== statusFilter) return false;
      if (!query) return true;
      const account = accounts[row.investorAccountId];
      const haystack = [
        row.requestNumber,
        account?.fullNameFa ?? '',
        account?.fullNameEn ?? '',
        account?.nationalId ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, accounts, search, typeFilter, statusFilter]);

  const tiles = useMemo<SummaryTile[]>(() => {
    const awaiting = requests.filter((r) => OPEN_STATUSES.includes(r.status)).length;
    const manual = requests.filter((r) => r.needsManualReview).length;
    const failed = requests.filter(
      (r) => r.status === 'Failed' || r.status === 'Rejected',
    ).length;
    return [
      {
        key: 'total',
        label: t('tiles.total', { defaultValue: 'Total requests' }),
        hint: t('tiles.totalHint', { defaultValue: 'All requests in the queue' }),
        value: requests.length,
        tone: 'text-foreground',
      },
      {
        key: 'awaiting',
        label: t('tiles.awaiting', { defaultValue: 'Awaiting action' }),
        hint: t('tiles.awaitingHint', { defaultValue: 'Not yet settled or closed' }),
        value: awaiting,
        tone: 'text-blue-600 dark:text-blue-400',
      },
      {
        key: 'manual',
        label: t('tiles.manualReview', { defaultValue: 'Needs manual review' }),
        hint: t('tiles.manualReviewHint', { defaultValue: 'Flagged for an operator' }),
        value: manual,
        tone: 'text-amber-600 dark:text-amber-400',
      },
      {
        key: 'failed',
        label: t('tiles.failed', { defaultValue: 'Failed or rejected' }),
        hint: t('tiles.failedHint', { defaultValue: 'Ended without settlement' }),
        value: failed,
        tone: 'text-destructive',
      },
    ];
  }, [requests, t]);

  const hasFilters = search.trim() !== '' || typeFilter !== ALL || statusFilter !== ALL;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(ALL);
    setStatusFilter(ALL);
  };

  const columnCount = 10;

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Request queue' })}
      description={t('toolbar.description', {
        defaultValue:
          'Every deposit and withdrawal request, with its position in the settlement pipeline.',
      })}
    >
      {/* summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
        {tiles.map((tile) => (
          <Card key={tile.key}>
            <CardContent className="py-5">
              <div className="text-sm font-medium text-muted-foreground">{tile.label}</div>
              <div className={`mt-2 text-2xl font-semibold ${tile.tone}`}>
                {loading ? <Skeleton className="h-7 w-16" /> : tile.value.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{tile.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>{t('error.title', { defaultValue: 'Could not load requests' })}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters.title', { defaultValue: 'Filters' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spm-request-search">
                {t('filters.searchLabel', { defaultValue: 'Search' })}
              </Label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="spm-request-search"
                  className="ps-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filters.searchPlaceholder', {
                    defaultValue: 'Request number or investor name…',
                  })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('filters.typeLabel', { defaultValue: 'Type' })}</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all', { defaultValue: 'All' })}</SelectItem>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`type.${type}`, { defaultValue: type })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('filters.statusLabel', { defaultValue: 'Status' })}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all', { defaultValue: 'All' })}</SelectItem>
                  {REQUEST_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`status.${status}`, { defaultValue: status })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasFilters ? (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="size-4" />
                {t('filters.clear', { defaultValue: 'Clear filters' })}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('table.title', { defaultValue: 'Requests' })}
            {!loading ? (
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                {t('table.count', {
                  defaultValue: '{{shown}} of {{total}}',
                  shown: filtered.length,
                  total: requests.length,
                })}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.number', { defaultValue: 'Request No.' })}</TableHead>
                  <TableHead>{t('table.type', { defaultValue: 'Type' })}</TableHead>
                  <TableHead>{t('table.investor', { defaultValue: 'Investor' })}</TableHead>
                  <TableHead>{t('table.instrument', { defaultValue: 'Instrument' })}</TableHead>
                  <TableHead className="text-end">
                    {t('table.amount', { defaultValue: 'Amount (IRR)' })}
                  </TableHead>
                  <TableHead className="text-end">
                    {t('table.units', { defaultValue: 'Units' })}
                  </TableHead>
                  <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead>{t('table.submitted', { defaultValue: 'Submitted' })}</TableHead>
                  <TableHead>{t('table.flags', { defaultValue: 'Review' })}</TableHead>
                  <TableHead className="text-end">
                    {t('table.actions', { defaultValue: 'Actions' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3, 4].map((rowIndex) => (
                    <TableRow key={`skeleton-${rowIndex}`}>
                      <TableCell colSpan={columnCount}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount}>
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                        <Inbox className="size-6" />
                        <span>
                          {t('table.empty', {
                            defaultValue: 'No request matches the current filters.',
                          })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        <Link
                          href={`/requests/${row.id}`}
                          className="hover:underline font-medium"
                        >
                          {row.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={REQUEST_TYPE_VARIANT[row.requestType]}>
                          {t(`type.${row.requestType}`, { defaultValue: row.requestType })}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {investorName(row.investorAccountId)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {instrumentSymbol(row.instrumentId)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm whitespace-nowrap">
                        {formatAmount(row.amount)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm whitespace-nowrap">
                        {formatUnits(row.units)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={REQUEST_STATUS_VARIANT[row.status]}>
                          {t(`status.${row.status}`, { defaultValue: row.status })}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {formatDate(row.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {row.needsManualReview ? (
                          <span
                            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
                            title={t('table.manualReviewHint', {
                              defaultValue: 'Flagged for manual review',
                            })}
                          >
                            <TriangleAlert className="size-4" />
                            <span className="text-xs">
                              {t('table.manualReview', { defaultValue: 'Manual' })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link href={`/requests/${row.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('table.open', { defaultValue: 'Open timeline' })}
                          >
                            <ArrowUpRight className="size-4" />
                          </Button>
                        </Link>
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
