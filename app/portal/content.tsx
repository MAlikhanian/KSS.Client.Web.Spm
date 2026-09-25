'use client';

import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { PortalShell } from './components/portal-shell';
import { usePortalInvestor } from './components/use-portal-investor';
import {
  ActivityCard,
  AssetHistoryCard,
  CompositionCard,
  FundCards,
  NewRequestButton,
  PendingCard,
  ProfitCard,
  RequestReportCard,
  TotalAssetsCard,
} from './components/widgets';
import {
  getHoldings,
  getInstruments,
  getLedgerForAccount,
  getProfitDistributions,
  getRequestsForAccount,
} from '../components/spm-api';
import { MOCK_TODAY } from '../components/mock-store';
import type {
  Guid,
  Holding,
  Instrument,
  InvestmentRequest,
  LedgerEntry,
  ProfitDistribution,
} from '../components/types';

/**
 * SPM investor portal — the dashboard (proposal §6-1).
 *
 * Loads once and hands already-fetched data to presentational widgets, so the
 * page makes one pass over the seam rather than each card fetching for itself.
 *
 * The investor selector is a MOCK AFFORDANCE. In the finished platform the
 * signed-in user determines whose portfolio this is; §6-1 item 1 (registration
 * and authentication) is not built, so the portal has no way to know who you
 * are. It is a visible stand-in rather than a hidden assumption.
 */
export function PortalContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  const { accounts, accountId, account, setAccountId, failed: accountsFailed } =
    usePortalInvestor();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [profit, setProfit] = useState<ProfitDistribution[]>([]);

  const [failed, setFailed] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);

  useEffect(() => {
    let alive = true;
    getInstruments()
      .then((i) => alive && setInstruments(i))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Everything that depends on which investor is selected.
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    setLoadingAccount(true);
    Promise.all([
      getHoldings(accountId),
      getLedgerForAccount(accountId),
      getRequestsForAccount(accountId),
      getProfitDistributions(accountId),
    ])
      .then(([h, l, r, p]) => {
        if (!alive) return;
        setHoldings(h);
        setLedger(l);
        setRequests(r);
        setProfit(p);
        setLoadingAccount(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoadingAccount(false);
      });
    return () => {
      alive = false;
    };
  }, [accountId]);

  const loading = accounts === null;

  return (
    <PortalShell
      title={t('portal.title', { defaultValue: 'Investor portal' })}
      description={t('portal.description', {
        defaultValue: 'Your holdings, requests and account movements at a glance.',
      })}
      actions={<NewRequestButton />}
    >
      {failed || accountsFailed ? (
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>{t('error.title', { defaultValue: 'Could not load requests' })}</AlertTitle>
        </Alert>
      ) : null}

      {/* Mock affordance: real auth replaces this entirely. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[240px] flex-col gap-1.5">
          <Label>{t('portal.investor', { defaultValue: 'Investor' })}</Label>
          <Select value={accountId} onValueChange={(v) => setAccountId(v as Guid)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(accounts ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {isFa ? a.fullNameFa : a.fullNameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          {t('portal.investorHint', {
            defaultValue: 'In the finished platform this comes from authentication.',
          })}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <TotalAssetsCard account={account} asOf={MOCK_TODAY} />

          <div className="grid grid-cols-1 gap-5 lg:gap-7.5 xl:grid-cols-3">
            <div className="grid gap-5 lg:gap-7.5 xl:col-span-2">
              {loadingAccount ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <FundCards holdings={holdings} instruments={instruments} />
              )}
              <AssetHistoryCard ledger={ledger} />
              <RequestReportCard requests={requests} instruments={instruments} />
            </div>

            <div className="grid gap-5 lg:gap-7.5">
              <CompositionCard holdings={holdings} instruments={instruments} />
              <PendingCard kind="Deposit" requests={requests} />
              <PendingCard kind="Withdrawal" requests={requests} />
              <ProfitCard distributions={profit} instruments={instruments} />
              <ActivityCard requests={requests} />
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}
