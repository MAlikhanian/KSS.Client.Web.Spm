'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileQuestion,
  MinusCircle,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { SectionShell, SectionShellWithSidebar } from '../../components/section-shell';
import {
  fillPercent,
  formatAmount,
  formatDate,
  formatDateTime,
  formatUnits,
  ORDER_STATUS_VARIANT,
  REQUEST_STATUS_VARIANT,
  SETTLEMENT_STATUS_VARIANT,
  type BadgeVariant,
} from '../../components/format';
import { getRequestDetail } from '../../components/spm-api';
import type { RequestDetail, RequestTimelineStage } from '../../components/types';

type StageState = RequestTimelineStage['state'];

const STAGE_ICON: Record<StageState, LucideIcon> = {
  done: CheckCircle2,
  current: Clock,
  pending: Circle,
  failed: XCircle,
  skipped: MinusCircle,
};

const STAGE_ICON_COLOR: Record<StageState, string> = {
  done: 'text-green-600 dark:text-green-400',
  current: 'text-blue-600 dark:text-blue-400',
  pending: 'text-muted-foreground',
  failed: 'text-destructive',
  skipped: 'text-muted-foreground',
};

const STAGE_BADGE_VARIANT: Record<StageState, BadgeVariant> = {
  done: 'success',
  current: 'primary',
  pending: 'secondary',
  failed: 'destructive',
  skipped: 'secondary',
};

const DIRECTION_VARIANT: Record<'Debit' | 'Credit', BadgeVariant> = {
  Debit: 'destructive',
  Credit: 'success',
};

interface FieldProps {
  label: string;
  children: ReactNode;
  mono?: boolean;
}

function Field({ label, children, mono = false }: FieldProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-end break-all ${mono ? 'font-mono' : 'font-medium'}`}>
        {children}
      </span>
    </div>
  );
}

export function RequestDetailContent() {
  const { t, i18n } = useTranslation('spm-request-detail');
  const isFa = i18n.language === 'fa';

  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRequestDetail(id)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
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
  }, [id]);

  const backButton = (
    <Link href="/requests">
      <Button variant="outline" size="sm">
        <ArrowLeft className="size-4" />
        {t('actions.back', { defaultValue: 'Back to queue' })}
      </Button>
    </Link>
  );

  const shellDescription = t('toolbar.description', {
    defaultValue: 'The full settlement trail for a single investment request.',
  });

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <SectionShell
        title={t('toolbar.title', { defaultValue: 'Request detail' })}
        description={shellDescription}
        actions={backButton}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('loading', { defaultValue: 'Loading request…' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          </CardContent>
        </Card>
      </SectionShell>
    );
  }

  /* ── error ──────────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <SectionShell
        title={t('toolbar.title', { defaultValue: 'Request detail' })}
        description={shellDescription}
        actions={backButton}
      >
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>{t('error.title', { defaultValue: 'Could not load the request' })}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </SectionShell>
    );
  }

  /* ── not found ──────────────────────────────────────────────────────────── */
  if (!detail) {
    return (
      <SectionShell
        title={t('toolbar.title', { defaultValue: 'Request detail' })}
        description={shellDescription}
        actions={backButton}
      >
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <FileQuestion className="size-8 text-muted-foreground" />
              <div className="text-lg font-semibold">
                {t('notFound.title', { defaultValue: 'Request not found' })}
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                {t('notFound.description', {
                  defaultValue:
                    'No request exists with this identifier. It may have been removed, or the link is out of date.',
                })}
              </p>
              {id ? <p className="font-mono text-xs text-muted-foreground">{id}</p> : null}
              <div className="mt-2">{backButton}</div>
            </div>
          </CardContent>
        </Card>
      </SectionShell>
    );
  }

  const { request, account, instrument, order, orderEvents, settlement, ledger, timeline } = detail;

  const stageLabel = (stage: RequestTimelineStage): string => {
    if (stage.key === 'complete' && stage.state === 'failed') {
      return t('stages.closed', { defaultValue: 'Closed' });
    }
    if (stage.key === 'payment' && request.requestType === 'Withdrawal') {
      return t('stages.saleProceeds', { defaultValue: 'Sale proceeds' });
    }
    return t(`stages.${stage.key}`, { defaultValue: stage.label });
  };

  /* ── sidebar cardex ─────────────────────────────────────────────────────── */
  const sidebar = (
    <div className="grid gap-5 lg:gap-7.5">
      <Card>
        <CardHeader>
          <CardTitle>{t('cardex.title', { defaultValue: 'Request cardex' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label={t('cardex.requestNumber', { defaultValue: 'Request No.' })} mono>
            {request.requestNumber}
          </Field>
          <Field label={t('cardex.status', { defaultValue: 'Status' })}>
            <Badge variant={REQUEST_STATUS_VARIANT[request.status]}>
              {t(`requestStatus.${request.status}`, { defaultValue: request.status })}
            </Badge>
          </Field>
          <Separator className="my-2" />
          <Field label={t('cardex.investor', { defaultValue: 'Investor' })}>
            {isFa ? account.fullNameFa : account.fullNameEn}
          </Field>
          <Field label={t('cardex.nationalId', { defaultValue: 'National ID' })} mono>
            {account.nationalId}
          </Field>
          <Field label={t('cardex.accountCode', { defaultValue: 'Brokerage account code' })} mono>
            {account.brokerageAccountCode ?? '—'}
          </Field>
          <Field label={t('cardex.iban', { defaultValue: 'IBAN' })} mono>
            {account.iban ?? '—'}
          </Field>
          <Separator className="my-2" />
          <Field label={t('cardex.instrument', { defaultValue: 'Instrument' })}>
            {instrument.symbol} — {isFa ? instrument.nameFa : instrument.nameEn}
          </Field>
          <Field label={t('cardex.amount', { defaultValue: 'Amount (IRR)' })} mono>
            {formatAmount(request.amount)}
          </Field>
          <Field label={t('cardex.units', { defaultValue: 'Units' })} mono>
            {formatUnits(request.units)}
          </Field>
          <Separator className="my-2" />
          <Field label={t('cardex.idempotencyKey', { defaultValue: 'Idempotency key' })} mono>
            {request.idempotencyKey}
          </Field>
          {request.needsManualReview ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <TriangleAlert className="size-4 shrink-0" />
              <span className="text-xs">
                {t('cardex.manualReview', { defaultValue: 'Flagged for manual review' })}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SectionShellWithSidebar
      title={t('toolbar.title', { defaultValue: 'Request detail' })}
      description={shellDescription}
      actions={backButton}
      sidebar={sidebar}
    >
      {/* 1 — timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t('timeline.title', { defaultValue: 'Settlement timeline' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('timeline.empty', { defaultValue: 'No timeline stages recorded.' })}
            </div>
          ) : (
            <ol className="relative">
              {timeline.map((stage, index) => {
                const Icon = STAGE_ICON[stage.state];
                const isLast = index === timeline.length - 1;
                return (
                  <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {!isLast ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-8 start-3.5 h-[calc(100%-2rem)] w-px bg-border"
                      />
                    ) : null}
                    <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className={`size-4 ${STAGE_ICON_COLOR[stage.state]}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{stageLabel(stage)}</span>
                        <Badge variant={STAGE_BADGE_VARIANT[stage.state]} size="sm">
                          {t(`stageState.${stage.state}`, { defaultValue: stage.state })}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDateTime(stage.occurredAt)}
                        </span>
                      </div>
                      {stage.detail ? (
                        <p className="mt-1 text-sm text-muted-foreground break-words">
                          {stage.detail}
                        </p>
                      ) : null}
                      {stage.actor ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('timeline.actor', { defaultValue: 'Actor' })}: {stage.actor}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* 2 — order */}
      <Card>
        <CardHeader>
          <CardTitle>{t('order.title', { defaultValue: 'Order' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {!order ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('order.none', { defaultValue: 'No order has been placed for this request yet.' })}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label={t('order.side', { defaultValue: 'Side' })}>
                  <Badge variant={order.side === 'Buy' ? 'success' : 'warning'}>
                    {t(`orderSide.${order.side}`, { defaultValue: order.side })}
                  </Badge>
                </Field>
                <Field label={t('order.status', { defaultValue: 'Status' })}>
                  <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                    {t(`orderStatus.${order.status}`, { defaultValue: order.status })}
                  </Badge>
                </Field>
                <Field label={t('order.omsRef', { defaultValue: 'OMS reference' })} mono>
                  {order.omsOrderRef ?? '—'}
                </Field>
                <Field label={t('order.price', { defaultValue: 'Price (IRR)' })} mono>
                  {formatAmount(order.price)}
                </Field>
                <Field label={t('order.placedAt', { defaultValue: 'Placed at' })} mono>
                  {formatDateTime(order.placedAt)}
                </Field>
                <Field label={t('order.lastPolledAt', { defaultValue: 'Last polled at' })} mono>
                  {formatDateTime(order.lastPolledAt)}
                </Field>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('order.filled', { defaultValue: 'Filled' })}
                  </span>
                  <span className="font-mono">
                    {formatUnits(order.filledQuantity)} / {formatUnits(order.quantity)} (
                    {fillPercent(order.filledQuantity, order.quantity)}%)
                  </span>
                </div>
                <Progress value={fillPercent(order.filledQuantity, order.quantity)} />
              </div>

              {order.failureReason ? (
                <Alert variant="destructive">
                  <AlertIcon>
                    <TriangleAlert />
                  </AlertIcon>
                  <AlertTitle>
                    {t('order.failureReason', { defaultValue: 'Failure reason' })}
                  </AlertTitle>
                  <AlertDescription>{order.failureReason}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3 — order events */}
      <Card>
        <CardHeader>
          <CardTitle>{t('events.title', { defaultValue: 'Order events' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {orderEvents.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('events.empty', { defaultValue: 'No order events recorded.' })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('events.occurredAt', { defaultValue: 'Occurred at' })}</TableHead>
                    <TableHead>{t('events.action', { defaultValue: 'Action' })}</TableHead>
                    <TableHead>{t('events.detail', { defaultValue: 'Detail' })}</TableHead>
                    <TableHead>{t('events.actor', { defaultValue: 'Actor' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {formatDateTime(event.occurredAt)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{event.action}</TableCell>
                      <TableCell className="text-sm">{event.detail}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {event.actor}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 — settlement */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settlement.title', { defaultValue: 'Settlement' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {!settlement ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('settlement.none', { defaultValue: 'No settlement has been scheduled yet.' })}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label={t('settlement.status', { defaultValue: 'Status' })}>
                  <Badge variant={SETTLEMENT_STATUS_VARIANT[settlement.status]}>
                    {t(`settlementStatus.${settlement.status}`, { defaultValue: settlement.status })}
                  </Badge>
                </Field>
                <Field label={t('settlement.paidAt', { defaultValue: 'Paid at' })} mono>
                  {formatDateTime(settlement.paidAt)}
                </Field>
                <Field label={t('settlement.tradeDate', { defaultValue: 'Trade date' })} mono>
                  {formatDate(settlement.tradeDate)}
                </Field>
                <Field label={t('settlement.dueDate', { defaultValue: 'Settlement due date' })} mono>
                  {formatDate(settlement.settlementDueDate)}
                </Field>
                <Field label={t('settlement.gross', { defaultValue: 'Gross amount (IRR)' })} mono>
                  {formatAmount(settlement.grossAmount)}
                </Field>
                <Field label={t('settlement.fee', { defaultValue: 'Fee (IRR)' })} mono>
                  {formatAmount(settlement.feeAmount)}
                </Field>
                <Field label={t('settlement.net', { defaultValue: 'Net payable (IRR)' })} mono>
                  {formatAmount(settlement.netPayable)}
                </Field>
              </div>

              {settlement.failureReason ? (
                <Alert variant="destructive">
                  <AlertIcon>
                    <TriangleAlert />
                  </AlertIcon>
                  <AlertTitle>
                    {t('settlement.failureReason', { defaultValue: 'Failure reason' })}
                  </AlertTitle>
                  <AlertDescription>{settlement.failureReason}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5 — ledger */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ledger.title', { defaultValue: 'Ledger entries' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('ledger.empty', { defaultValue: 'No ledger entry is tied to this request.' })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ledger.valueDate', { defaultValue: 'Value date' })}</TableHead>
                    <TableHead>{t('ledger.flow', { defaultValue: 'Flow' })}</TableHead>
                    <TableHead>{t('ledger.direction', { defaultValue: 'Direction' })}</TableHead>
                    <TableHead className="text-end">
                      {t('ledger.amount', { defaultValue: 'Amount (IRR)' })}
                    </TableHead>
                    <TableHead className="text-end">
                      {t('ledger.balanceAfter', { defaultValue: 'Balance after' })}
                    </TableHead>
                    <TableHead>{t('ledger.description', { defaultValue: 'Description' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {formatDate(entry.valueDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {t(`ledgerFlow.${entry.flowType}`, { defaultValue: entry.flowType })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={DIRECTION_VARIANT[entry.direction]}>
                          {t(`ledgerDirection.${entry.direction}`, { defaultValue: entry.direction })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm whitespace-nowrap">
                        {formatAmount(entry.amount)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-sm whitespace-nowrap">
                        {formatAmount(entry.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShellWithSidebar>
  );
}
