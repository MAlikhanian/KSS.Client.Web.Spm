'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, Search, TriangleAlert } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import { getAccounts, getLedger } from '../components/spm-api';
import {
  formatAmount,
  formatAmountCompact,
  formatDateTime,
  formatUnits,
  type BadgeVariant,
} from '../components/format';
import type {
  Guid,
  InvestorAccount,
  LedgerDirection,
  LedgerEntry,
  LedgerFlowType,
} from '../components/types';

/**
 * /spm/ledger — investor account statement (گردش حساب).
 *
 * The ledger is append-only on the backend, so this screen is strictly
 * read-only: it offers no create, edit or delete affordance anywhere. The only
 * write-shaped action is Print, which touches nothing.
 */

const DIRECTION_VARIANT: Record<LedgerDirection, BadgeVariant> = {
  Debit: 'destructive',
  Credit: 'success',
};

/** Debit drains the account (red), Credit funds it (green). */
const DIRECTION_TEXT: Record<LedgerDirection, string> = {
  Debit: 'text-red-600 dark:text-red-400',
  Credit: 'text-green-600 dark:text-green-400',
};

const DIRECTION_SIGN: Record<LedgerDirection, string> = {
  Debit: '-',
  Credit: '+',
};

const FLOW_TYPES: LedgerFlowType[] = [
  'DepositIn',
  'UnitsPurchased',
  'UnitsSold',
  'WithdrawalOut',
  'Fee',
  'Adjustment',
];

const FLOW_TYPE_KEY: Record<LedgerFlowType, string> = {
  DepositIn: 'flow.depositIn',
  UnitsPurchased: 'flow.unitsPurchased',
  UnitsSold: 'flow.unitsSold',
  WithdrawalOut: 'flow.withdrawalOut',
  Fee: 'flow.fee',
  Adjustment: 'flow.adjustment',
};

const FLOW_TYPE_FALLBACK: Record<LedgerFlowType, string> = {
  DepositIn: 'Deposit in',
  UnitsPurchased: 'Units purchased',
  UnitsSold: 'Units sold',
  WithdrawalOut: 'Withdrawal out',
  Fee: 'Fee',
  Adjustment: 'Adjustment',
};

const DIRECTIONS: LedgerDirection[] = ['Debit', 'Credit'];

const DIRECTION_KEY: Record<LedgerDirection, string> = {
  Debit: 'direction.debit',
  Credit: 'direction.credit',
};

const DIRECTION_FALLBACK: Record<LedgerDirection, string> = {
  Debit: 'Debit',
  Credit: 'Credit',
};

const ALL = 'all';
const COLUMN_COUNT = 6;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface TileProps {
  label: string;
  value: string;
  hint?: string;
}

function Tile({ label, value, hint }: TileProps) {
  return (
    <Card className="print:shadow-none">
      <CardContent className="py-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-semibold tracking-tight" dir="ltr">
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {hint}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface LoadingRowsProps {
  rows: number;
}

function LoadingRows({ rows }: LoadingRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <TableRow key={index}>
          {Array.from({ length: COLUMN_COUNT }, (__, cell) => (
            <TableCell key={cell}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function LedgerContent() {
  const { t, i18n } = useTranslation('spm-ledger');
  const isFa = i18n.language?.startsWith('fa') ?? false;

  const [accounts, setAccounts] = useState<InvestorAccount[]>([]);
  const [accountId, setAccountId] = useState<Guid>('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState<string>(ALL);
  const [directionFilter, setDirectionFilter] = useState<string>(ALL);

  /* The account list drives the picker; the first account is the default. */
  useEffect(() => {
    let cancelled = false;
    setLoadingAccounts(true);
    getAccounts()
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
        setAccountId((current) => current || rows[0]?.id || '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* The statement itself, refetched whenever the picked account changes. */
  useEffect(() => {
    if (!accountId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoadingEntries(true);
    setError(null);
    getLedger(accountId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );

  const accountName = useCallback(
    (account: InvestorAccount) => (isFa ? account.fullNameFa : account.fullNameEn),
    [isFa],
  );

  const flowLabel = useCallback(
    (flow: LedgerFlowType) => t(FLOW_TYPE_KEY[flow], { defaultValue: FLOW_TYPE_FALLBACK[flow] }),
    [t],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (flowFilter !== ALL && entry.flowType !== flowFilter) return false;
      if (directionFilter !== ALL && entry.direction !== directionFilter) return false;
      if (!needle) return true;
      const haystack = `${entry.description} ${FLOW_TYPE_FALLBACK[entry.flowType]} ${entry.valueDate}`;
      return haystack.toLowerCase().includes(needle);
    });
  }, [entries, search, flowFilter, directionFilter]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);

  const printAction = (
    <Button variant="outline" onClick={handlePrint} className="print:hidden">
      <Printer className="size-4" />
      {t('actions.print', { defaultValue: 'Print' })}
    </Button>
  );

  return (
    <SectionShell
      title={t('title', { defaultValue: 'Account statement' })}
      description={t('toolbar.description', {
        defaultValue:
          'Append-only ledger for an investor account: every movement with its running balance. Read-only.',
      })}
      actions={printAction}
    >
      {error ? (
        <Alert variant="destructive" appearance="light" icon="destructive" className="print:hidden">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('errors.loadFailed', { defaultValue: 'Could not load the statement' })} — {error}
          </AlertTitle>
        </Alert>
      ) : null}

      {/* Account picker + client-side filters. Not part of the printed sheet. */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t('filters.title', { defaultValue: 'Statement scope' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('filters.account', { defaultValue: 'Account' })}</Label>
              {loadingAccounts ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={accountId}
                  onValueChange={(value) => setAccountId(value)}
                  disabled={accounts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('filters.accountPlaceholder', {
                        defaultValue: 'Select an account',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {`${accountName(account)} — ${account.nationalId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('filters.flowType', { defaultValue: 'Flow type' })}</Label>
              <Select value={flowFilter} onValueChange={setFlowFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all', { defaultValue: 'All' })}</SelectItem>
                  {FLOW_TYPES.map((flow) => (
                    <SelectItem key={flow} value={flow}>
                      {flowLabel(flow)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.direction', { defaultValue: 'Direction' })}</Label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all', { defaultValue: 'All' })}</SelectItem>
                  {DIRECTIONS.map((direction) => (
                    <SelectItem key={direction} value={direction}>
                      {t(DIRECTION_KEY[direction], {
                        defaultValue: DIRECTION_FALLBACK[direction],
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('filters.search', { defaultValue: 'Search' })}</Label>
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filters.searchPlaceholder', {
                    defaultValue: 'Search the description…',
                  })}
                  className="ps-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three tiles for the selected account. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-7.5">
        <Tile
          label={t('tiles.totalUnits', { defaultValue: 'Total units held' })}
          value={loadingAccounts ? '…' : formatUnits(selectedAccount?.totalUnits)}
        />
        <Tile
          label={t('tiles.balance', { defaultValue: 'Current balance' })}
          value={loadingAccounts ? '…' : formatAmountCompact(selectedAccount?.balance)}
          hint={
            loadingAccounts
              ? undefined
              : `${formatAmount(selectedAccount?.balance)} ${t('common.rial', { defaultValue: 'IRR' })}`
          }
        />
        <Tile
          label={t('tiles.entries', { defaultValue: 'Number of entries' })}
          value={loadingEntries ? '…' : entries.length.toLocaleString('en-US')}
        />
      </div>

      {/* The statement. Print-friendly: flat, bordered, no glass tint on paper. */}
      <Card className="print:shadow-none print:border print:border-neutral-300 print:bg-white!">
        <CardHeader className="print:pb-2">
          <CardTitle>{t('statement.title', { defaultValue: 'Account statement' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Only on paper: identify whose statement this sheet is. */}
          <div className="hidden print:block mb-4 text-sm text-neutral-800">
            <div className="font-semibold">
              {selectedAccount ? accountName(selectedAccount) : '—'}
            </div>
            <div>
              {t('statement.nationalId', { defaultValue: 'National ID' })}:{' '}
              {selectedAccount?.nationalId ?? '—'}
            </div>
            <div>
              {t('statement.iban', { defaultValue: 'IBAN' })}: {selectedAccount?.iban ?? '—'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="print:text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    {t('table.valueDate', { defaultValue: 'Value date' })}
                  </TableHead>
                  <TableHead>{t('table.description', { defaultValue: 'Description' })}</TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('table.flowType', { defaultValue: 'Flow type' })}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('table.direction', { defaultValue: 'Direction' })}
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    {t('table.amount', { defaultValue: 'Amount' })}
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    {t('table.balanceAfter', { defaultValue: 'Balance after' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEntries ? (
                  <LoadingRows rows={5} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {accountId
                        ? t('table.empty', {
                            defaultValue: 'No ledger entries match the current filters.',
                          })
                        : t('table.noAccount', {
                            defaultValue: 'Select an account to see its statement.',
                          })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => (
                    <TableRow key={entry.id} className="break-inside-avoid">
                      <TableCell className="whitespace-nowrap text-sm" dir="ltr">
                        {formatDateTime(entry.valueDate)}
                      </TableCell>
                      <TableCell className="font-medium">{entry.description}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary" appearance="light" size="sm">
                          {flowLabel(entry.flowType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={DIRECTION_VARIANT[entry.direction]}
                          appearance="light"
                          size="sm"
                        >
                          {t(DIRECTION_KEY[entry.direction], {
                            defaultValue: DIRECTION_FALLBACK[entry.direction],
                          })}
                        </Badge>
                      </TableCell>
                      <TableCell
                        dir="ltr"
                        className={`text-right whitespace-nowrap font-mono tabular-nums ${DIRECTION_TEXT[entry.direction]}`}
                      >
                        {`${DIRECTION_SIGN[entry.direction]}${formatAmount(entry.amount)}`}
                      </TableCell>
                      <TableCell
                        dir="ltr"
                        className="text-right whitespace-nowrap font-mono tabular-nums"
                      >
                        {formatAmount(entry.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            {t('statement.readOnlyNote', {
              defaultValue:
                'This ledger is append-only — entries are never edited or removed. Corrections are posted as new adjustment entries.',
            })}
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
