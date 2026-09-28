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
import { PortalShell } from '../components/portal-shell';
import { usePortalInvestor } from '../components/use-portal-investor';
import { NewRequestButton, PendingCard, RequestReportCard } from '../components/widgets';
import { getInstruments, getRequestsForAccount } from '../../components/spm-api';
import type { Guid, Instrument, InvestmentRequest } from '../../components/types';

/**
 * Investor portal — my requests (proposal §6-1 item 4:
 * «مشاهده وضعیت لحظه‌ای درخواست‌ها و سفارش‌ها»).
 *
 * Reads the same store the operator console writes to, so a status an operator
 * advances shows here without either side doing anything special.
 */
export function PortalRequestsContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';
  const { accounts, accountId, setAccountId, failed: accountsFailed } = usePortalInvestor();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [requests, setRequests] = useState<InvestmentRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getInstruments()
      .then((i) => alive && setInstruments(i))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    setRequests(null);
    getRequestsForAccount(accountId)
      .then((r) => alive && setRequests(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [accountId]);

  return (
    <PortalShell
      title={t('portal.nav.myRequests', { defaultValue: 'My requests' })}
      description={t('portal.requests.title', { defaultValue: 'Request report' })}
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

      <div className="flex min-w-[240px] max-w-sm flex-col gap-1.5">
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

      {requests === null ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:gap-7.5 md:grid-cols-2">
            <PendingCard kind="Deposit" requests={requests} />
            <PendingCard kind="Withdrawal" requests={requests} />
          </div>
          <RequestReportCard requests={requests} instruments={instruments} />
        </>
      )}
    </PortalShell>
  );
}
