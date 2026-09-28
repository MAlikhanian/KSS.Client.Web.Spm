'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import {
  formatAmount,
  formatAmountCompact,
  formatDate,
  formatUnits,
  REQUEST_STATUS_VARIANT,
} from '../../components/format';
import type {
  Holding,
  Instrument,
  InvestmentRequest,
  InvestorAccount,
  LedgerEntry,
  ProfitDistribution,
} from '../../components/types';

/**
 * SPM investor portal — the dashboard widgets (proposal §6-1, items 2, 4 and 5).
 *
 * Presentational only: every one takes already-loaded data as props, so the page
 * fetches once and nothing here knows the data is mock. When KSS.Service.SPM
 * lands, none of these components change.
 *
 * The layout follows the fund-panel convention the client already recognises:
 * a headline total, holdings by fund, an asset-history chart and a request
 * report in the main column; composition, pending issuance/redemption, profit
 * and recent activity alongside.
 */

/** One colour per instrument category, reused by the donut and the fund cards. */
const CATEGORY_COLOUR: Record<string, string> = {
  FixedIncomeEtf: '#0d9488',
  CommodityFund: '#d97706',
  EquityMixedFund: '#6366f1',
};

const FALLBACK_COLOUR = '#94a3b8';

/** Requests still moving — i.e. not yet settled, rejected, failed or cancelled. */
const OPEN_STATUSES = new Set([
  'Draft',
  'Submitted',
  'Validated',
  'AwaitingPayment',
  'Paid',
  'OrderPlaced',
  'PartiallyFilled',
  'Filled',
]);

/* ── 1 · headline total ───────────────────────────────────────────────────── */

export function TotalAssetsCard({
  account,
  asOf,
}: {
  account: InvestorAccount | null;
  asOf: string;
}) {
  const { t } = useTranslation('spm-requests');

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t('portal.total.title', { defaultValue: 'Total assets including profit' })}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatAmount(account?.balance ?? 0)}
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm text-muted-foreground">
              {t('portal.total.units', { defaultValue: 'Total units' })}
            </p>
            <p className="mt-1 text-lg font-medium">{formatUnits(account?.totalUnits ?? 0)}</p>
          </div>
          <Badge variant="secondary">
            {t('portal.total.asOf', { date: formatDate(asOf), defaultValue: `as at ${formatDate(asOf)}` })}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 2 · asset composition donut ──────────────────────────────────────────── */

export function CompositionCard({
  holdings,
  instruments,
}: {
  holdings: Holding[];
  instruments: Instrument[];
}) {
  const { t } = useTranslation('spm-requests');

  const slices = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const h of holdings) {
      const instrument = instruments.find((i) => i.id === h.instrumentId);
      const key = instrument?.instrumentType ?? 'Other';
      byCategory.set(key, (byCategory.get(key) ?? 0) + h.value);
    }
    return Array.from(byCategory, ([key, value]) => ({ key, value }));
  }, [holdings, instruments]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.composition.title', { defaultValue: 'Asset composition' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.composition.empty', { defaultValue: 'No holdings to show.' })}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative h-[190px] w-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={CATEGORY_COLOUR[s.key] ?? FALLBACK_COLOUR} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold">{formatAmountCompact(total)}</span>
              </div>
            </div>

            <ul className="grid gap-2">
              {slices.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-6 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLOUR[s.key] ?? FALLBACK_COLOUR }}
                  />
                  <span>{t(`portal.composition.${s.key}`, { defaultValue: s.key })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 3 · holdings by fund ─────────────────────────────────────────────────── */

export function FundCards({
  holdings,
  instruments,
}: {
  holdings: Holding[];
  instruments: Instrument[];
}) {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.funds.title', { defaultValue: 'Holdings by fund' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.funds.empty', { defaultValue: 'You hold no units in any fund.' })}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {holdings.map((h) => {
              const instrument = instruments.find((i) => i.id === h.instrumentId);
              const colour = CATEGORY_COLOUR[instrument?.instrumentType ?? ''] ?? FALLBACK_COLOUR;
              return (
                // Links to the FUND, not to the position: everything the detail
                // page shows — yield, prospectus, rules, FAQ — is a property of
                // the instrument, and `instrumentId` is the only identifier a
                // Holding carries (it has no primary key of its own, which is
                // why the React key below is a composite). A <Link> keeps this
                // file presentational, as its header comment intends;
                // NewRequestButton already sets that precedent.
                <Link
                  key={`${h.investorAccountId}-${h.instrumentId}`}
                  href={`/portal/instruments/${h.instrumentId}`}
                  className="rounded-xl p-4 text-white shadow-sm transition-shadow hover:shadow-lg"
                  style={{ backgroundColor: colour }}
                >
                  <p className="text-xs opacity-90">{formatDate(h.asOf)}</p>
                  <p className="mt-1 font-medium">
                    {instrument ? (isFa ? instrument.nameFa : instrument.nameEn) : h.instrumentId}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{formatAmount(h.value)}</p>
                  <p className="text-xs opacity-90">
                    {t('portal.funds.units', { defaultValue: 'Units' })}: {formatUnits(h.units)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="opacity-80">
                        {t('portal.funds.navIssue', { defaultValue: 'Issue NAV' })}
                      </p>
                      <p className="font-medium">{formatAmount(h.navIssue)}</p>
                    </div>
                    <div>
                      <p className="opacity-80">
                        {t('portal.funds.navRedeem', { defaultValue: 'Redeem NAV' })}
                      </p>
                      <p className="font-medium">{formatAmount(h.navRedeem)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 4 · asset history ────────────────────────────────────────────────────── */

export function AssetHistoryCard({ ledger }: { ledger: LedgerEntry[] }) {
  const { t } = useTranslation('spm-requests');

  const series = useMemo(
    () =>
      ledger.map((l) => ({
        date: formatDate(l.valueDate),
        balance: l.balanceAfter,
      })),
    [ledger],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.history.title', { defaultValue: 'Asset history' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.history.empty', { defaultValue: 'No history to show.' })}
          </p>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="spmPortalBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v: number) => formatAmountCompact(v)}
                />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#spmPortalBalance)"
                  name={t('portal.history.balance', { defaultValue: 'Balance' })}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 5 · request report ───────────────────────────────────────────────────── */

export function RequestReportCard({
  requests,
  instruments,
}: {
  requests: InvestmentRequest[];
  instruments: Instrument[];
}) {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.requests.title', { defaultValue: 'Request report' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.requests.empty', { defaultValue: 'No results found.' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('portal.requests.type', { defaultValue: 'Type' })}</TableHead>
                <TableHead>{t('portal.requests.created', { defaultValue: 'Created' })}</TableHead>
                <TableHead>{t('portal.requests.fund', { defaultValue: 'Fund' })}</TableHead>
                <TableHead>{t('portal.requests.units', { defaultValue: 'Approx. units' })}</TableHead>
                <TableHead>{t('portal.requests.amount', { defaultValue: 'Amount (IRR)' })}</TableHead>
                <TableHead>{t('portal.requests.status', { defaultValue: 'Status' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const instrument = instruments.find((i) => i.id === r.instrumentId);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {r.requestType === 'Deposit' ? (
                          <ArrowDownLeft className="size-3.5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="size-3.5 text-amber-600" />
                        )}
                        {t(`type.${r.requestType}`, { defaultValue: r.requestType })}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(r.submittedAt)}</TableCell>
                    <TableCell>
                      {instrument ? (isFa ? instrument.nameFa : instrument.nameEn) : '—'}
                    </TableCell>
                    <TableCell>{formatUnits(r.units)}</TableCell>
                    <TableCell>{formatAmount(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={REQUEST_STATUS_VARIANT[r.status]} appearance="light">
                        {t(`status.${r.status}`, { defaultValue: r.status })}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 6 & 7 · pending issuance / redemption ────────────────────────────────── */

export function PendingCard({
  kind,
  requests,
}: {
  kind: 'Deposit' | 'Withdrawal';
  requests: InvestmentRequest[];
}) {
  const { t } = useTranslation('spm-requests');

  const open = requests.filter((r) => r.requestType === kind && OPEN_STATUSES.has(r.status));
  const amount = open.reduce((sum, r) => sum + r.amount, 0);
  const units = open.reduce((sum, r) => sum + (r.units ?? 0), 0);
  const isDeposit = kind === 'Deposit';

  const title = isDeposit
    ? t('portal.pendingIssue.title', { defaultValue: 'Pending issuance' })
    : t('portal.pendingRedeem.title', { defaultValue: 'Pending redemption' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <div
            className="flex size-[90px] items-center justify-center rounded-full border-8"
            style={{ borderColor: isDeposit ? '#10b981' : '#f59e0b' }}
          >
            <span className="text-lg font-semibold">{open.length}</span>
          </div>
          <div className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">
                {isDeposit
                  ? t('portal.pendingIssue.count', { defaultValue: 'Estimated count' })
                  : t('portal.pendingRedeem.count', { defaultValue: 'Pending count' })}
              </span>
              <span className="font-medium">{open.length}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">
                {isDeposit
                  ? t('portal.pendingIssue.amount', { defaultValue: 'Amount to deposit' })
                  : t('portal.pendingRedeem.units', { defaultValue: 'Total units' })}
              </span>
              <span className="font-medium">
                {isDeposit ? formatAmount(amount) : formatUnits(units)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 8 · profit distribution ──────────────────────────────────────────────── */

export function ProfitCard({
  distributions,
  instruments,
}: {
  distributions: ProfitDistribution[];
  instruments: Instrument[];
}) {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.profit.title', { defaultValue: 'Profit distribution' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {distributions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.profit.empty', { defaultValue: 'No results found.' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('portal.profit.fund', { defaultValue: 'Fund' })}</TableHead>
                <TableHead>{t('portal.profit.date', { defaultValue: 'Date' })}</TableHead>
                <TableHead>{t('portal.profit.amount', { defaultValue: 'Amount' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((d) => {
                const instrument = instruments.find((i) => i.id === d.instrumentId);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      {instrument ? (isFa ? instrument.nameFa : instrument.nameEn) : '—'}
                    </TableCell>
                    <TableCell>{formatDate(d.distributedAt)}</TableCell>
                    <TableCell>{formatAmount(d.amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 9 · recent activity ──────────────────────────────────────────────────── */

export function ActivityCard({ requests }: { requests: InvestmentRequest[] }) {
  const { t } = useTranslation('spm-requests');
  const recent = requests.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('portal.activity.title', { defaultValue: 'Recent activity' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('portal.activity.empty', { defaultValue: 'No activity recorded.' })}
          </p>
        ) : (
          <ul className="grid gap-3">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Wallet className="size-4 text-muted-foreground" />
                  <span>{t(`type.${r.requestType}`, { defaultValue: r.requestType })}</span>
                  <Badge variant={REQUEST_STATUS_VARIANT[r.status]} appearance="light" size="sm">
                    {t(`status.${r.status}`, { defaultValue: r.status })}
                  </Badge>
                </span>
                <span className="text-muted-foreground">{formatDate(r.submittedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ── quick action ─────────────────────────────────────────────────────────── */

export function NewRequestButton() {
  const { t } = useTranslation('spm-requests');
  return (
    <Button asChild>
      <Link href="/portal/new-request">
        {t('portal.nav.newRequest', { defaultValue: 'New request' })}
      </Link>
    </Button>
  );
}
