'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Landmark,
  Search,
  TriangleAlert,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SectionShell } from '../components/section-shell';
import { getAccounts } from '../components/spm-api';
import { formatAmount, formatDate, formatUnits } from '../components/format';
import type { InvestorAccount } from '../components/types';

/** Groups an IBAN into blocks of four so an operator can read it off a form. */
function formatIban(iban: string): string {
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/**
 * An account is "incomplete" when something blocks it operationally:
 * no brokerage code (cannot trade), no IBAN (cannot be paid out), or inactive.
 */
function hasIssue(account: InvestorAccount): boolean {
  return !account.brokerageAccountCode || !account.iban || !account.isActive;
}

/* ── tiles ────────────────────────────────────────────────────────────────── */

type TileTone = 'neutral' | 'success' | 'destructive' | 'warning';

const TILE_TONE: Record<TileTone, string> = {
  neutral: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  destructive: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
};

interface TileProps {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: TileTone;
}

function Tile({ label, value, hint, icon: Icon, tone }: TileProps) {
  return (
    <Card>
      <CardContent className="py-5 flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 ${TILE_TONE[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className={`text-2xl font-semibold leading-tight ${TILE_TONE[tone]}`} dir="ltr">
            {value.toLocaleString('en-US')}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */

const COLUMN_COUNT = 9;

export function AccountsContent() {
  const { t } = useTranslation('spm-accounts');

  const [accounts, setAccounts] = useState<InvestorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [issuesOnly, setIssuesOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getAccounts()
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
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

  const stats = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((a) => a.isActive).length,
      missingBrokerage: accounts.filter((a) => !a.brokerageAccountCode).length,
      missingIban: accounts.filter((a) => !a.iban).length,
    }),
    [accounts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return accounts.filter((a) => {
      if (issuesOnly && !hasIssue(a)) return false;
      if (!term) return true;

      const haystack = [
        a.fullNameFa,
        a.fullNameEn,
        a.accountHolderName,
        a.nationalId,
        a.brokerageAccountCode ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [accounts, search, issuesOnly]);

  const filtersApplied = search.trim().length > 0 || issuesOnly;

  return (
    <SectionShell
      title={t('toolbar.title', { defaultValue: 'Investor accounts' })}
      description={t('toolbar.description', {
        defaultValue:
          'Registry of investor accounts with their trading and payout readiness. A missing brokerage code blocks trading; a missing IBAN blocks withdrawals.',
      })}
    >
      {error ? (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('error.title', { defaultValue: 'Could not load the account registry.' })}
          </AlertTitle>
        </Alert>
      ) : null}

      {/* tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Tile
              label={t('tiles.total', { defaultValue: 'Total accounts' })}
              value={stats.total}
              hint={t('tiles.totalHint', { defaultValue: 'Accounts on the registry' })}
              icon={Users}
              tone="neutral"
            />
            <Tile
              label={t('tiles.active', { defaultValue: 'Active' })}
              value={stats.active}
              hint={t('tiles.activeHint', { defaultValue: 'Allowed to transact' })}
              icon={UserCheck}
              tone="success"
            />
            <Tile
              label={t('tiles.missingBrokerage', { defaultValue: 'Missing brokerage account' })}
              value={stats.missingBrokerage}
              hint={t('tiles.missingBrokerageHint', { defaultValue: 'Cannot place orders' })}
              icon={TriangleAlert}
              tone="destructive"
            />
            <Tile
              label={t('tiles.missingIban', { defaultValue: 'Missing IBAN' })}
              value={stats.missingIban}
              hint={t('tiles.missingIbanHint', { defaultValue: 'Cannot be paid out' })}
              icon={Landmark}
              tone="warning"
            />
          </>
        )}
      </div>

      {/* filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters.title', { defaultValue: 'Search and filter' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-end gap-5">
            <div className="flex-1 space-y-2">
              <Label htmlFor="spm-accounts-search">
                {t('filters.searchLabel', { defaultValue: 'Search' })}
              </Label>
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="spm-accounts-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('filters.searchPlaceholder', {
                    defaultValue: 'Name, national ID or brokerage code',
                  })}
                  className="ps-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 lg:pb-2">
              <Switch
                id="spm-accounts-issues-only"
                checked={issuesOnly}
                onCheckedChange={setIssuesOnly}
              />
              <div>
                <Label htmlFor="spm-accounts-issues-only" className="cursor-pointer">
                  {t('filters.issuesOnly', { defaultValue: 'Issues only' })}
                </Label>
                <div className="text-xs text-muted-foreground">
                  {t('filters.issuesOnlyHint', {
                    defaultValue: 'No brokerage code, no IBAN, or inactive',
                  })}
                </div>
              </div>
            </div>

            {filtersApplied ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setIssuesOnly(false);
                }}
                className="lg:pb-2 self-start lg:self-auto"
              >
                <X className="size-4" />
                {t('filters.clear', { defaultValue: 'Clear' })}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('table.title', { defaultValue: 'Accounts' })}
            {!loading ? (
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                {t('table.count', {
                  defaultValue: 'Showing {{shown}} of {{total}}',
                  shown: filtered.length,
                  total: accounts.length,
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
                  <TableHead>{t('table.name', { defaultValue: 'Full name' })}</TableHead>
                  <TableHead>{t('table.nationalId', { defaultValue: 'National ID' })}</TableHead>
                  <TableHead>
                    {t('table.brokerageCode', { defaultValue: 'Brokerage account' })}
                  </TableHead>
                  <TableHead>{t('table.iban', { defaultValue: 'IBAN' })}</TableHead>
                  <TableHead>{t('table.holder', { defaultValue: 'Account holder' })}</TableHead>
                  <TableHead>{t('table.openedAt', { defaultValue: 'Opened at' })}</TableHead>
                  <TableHead>{t('table.units', { defaultValue: 'Total units' })}</TableHead>
                  <TableHead>{t('table.balance', { defaultValue: 'Balance (IRR)' })}</TableHead>
                  <TableHead>{t('table.status', { defaultValue: 'Status' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      {Array.from({ length: COLUMN_COUNT }).map((_, c) => (
                        <TableCell key={c}>
                          <Skeleton className="h-4 w-full min-w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} className="py-12 text-center">
                      <div className="text-muted-foreground">
                        {t('table.empty', { defaultValue: 'No accounts match these filters' })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('table.emptyHint', {
                          defaultValue: 'Change the search term or turn off the issues filter.',
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id} className={a.isActive ? undefined : 'opacity-70'}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{a.fullNameFa}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {a.fullNameEn}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm whitespace-nowrap" dir="ltr">
                        {a.nationalId}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {a.brokerageAccountCode ? (
                          <span className="font-mono text-sm" dir="ltr">
                            {a.brokerageAccountCode}
                          </span>
                        ) : (
                          <Badge variant="destructive" appearance="light" size="sm">
                            {t('table.notProvisioned', { defaultValue: 'Not provisioned' })}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {a.iban ? (
                          <span className="font-mono text-xs" dir="ltr">
                            {formatIban(a.iban)}
                          </span>
                        ) : (
                          <Badge variant="secondary" appearance="light" size="sm">
                            {t('table.ibanMissing', { defaultValue: 'Missing' })}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">{a.accountHolderName}</TableCell>

                      <TableCell className="whitespace-nowrap text-sm" dir="ltr">
                        {formatDate(a.openedAt)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-end" dir="ltr">
                        {formatUnits(a.totalUnits)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-end" dir="ltr">
                        {formatAmount(a.balance)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge variant={a.isActive ? 'success' : 'secondary'} appearance="light">
                          {a.isActive
                            ? t('table.active', { defaultValue: 'Active' })
                            : t('table.inactive', { defaultValue: 'Inactive' })}
                        </Badge>
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
