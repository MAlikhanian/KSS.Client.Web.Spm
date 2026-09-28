'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import { useTranslation } from '@/hooks/useTranslation';
import { PortalShell } from '../components/portal-shell';
import { usePortalInvestor } from '../components/use-portal-investor';
import { formatAmount, formatUnits } from '../../components/format';
import { createRequest, getHoldings, getInstruments } from '../../components/spm-api';
import type { Guid, Holding, Instrument, RequestType } from '../../components/types';

const REQUEST_TYPES: RequestType[] = ['Deposit', 'Withdrawal'];

type Errors = Partial<Record<'instrument' | 'amount' | 'units', string>>;

/**
 * Investor portal — submit a deposit or withdrawal request
 * (proposal §6-1 item 3: «ثبت درخواست ورود و خروج سرمایه»).
 *
 * The investor-facing twin of the operator form at `app/requests/create`. Two
 * deliberate differences, both consequences of who is using it:
 *  - no investor picker in the form; it is your own portfolio
 *  - a withdrawal cannot exceed the units you actually hold, which the operator
 *    form does not enforce because an operator may be correcting a position
 */
export function PortalNewRequestContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account, accountId, failed: accountsFailed } = usePortalInvestor();

  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [failed, setFailed] = useState(false);

  const [requestType, setRequestType] = useState<RequestType>('Deposit');
  const [instrumentId, setInstrumentId] = useState<Guid | ''>('');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getInstruments()
      .then((all) => alive && setInstruments(all.filter((i) => i.isActive)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    getHoldings(accountId)
      .then((h) => alive && setHoldings(h))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [accountId]);

  /**
   * Seed the form from a fund page's deep link — `?instrumentId=<guid>&type=…`.
   *
   * Timing matters. This runs only once the instrument list has RESOLVED (there
   * is a deliberate 220 ms latency in `spm-api`): setting `instrumentId` before
   * the options exist leaves the Select holding a value with no matching
   * SelectItem, which Radix renders as the bare placeholder — it looks broken
   * rather than pre-filled.
   *
   * The membership check is not defensive padding. This page filters to
   * `isActive`, while the portal dashboard does not filter at all, so a card for
   * a closed fund can hand us an id that is genuinely absent from the list. Such
   * an id must fall back to the placeholder instead of being set blindly.
   *
   * `seeded` guards a one-shot: without it, every re-render with the same query
   * string would stamp the user's later choice back to the linked fund.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !instruments) return;
    seeded.current = true;

    const linkedType = searchParams.get('type');
    if (linkedType === 'Deposit' || linkedType === 'Withdrawal') {
      setRequestType(linkedType);
    }

    const linkedInstrument = searchParams.get('instrumentId');
    if (linkedInstrument && instruments.some((i) => i.id === linkedInstrument)) {
      setInstrumentId(linkedInstrument as Guid);
    }
  }, [instruments, searchParams]);

  const instrument = useMemo(
    () => instruments?.find((i) => i.id === instrumentId) ?? null,
    [instruments, instrumentId],
  );

  const heldUnits = useMemo(
    () => holdings.find((h) => h.instrumentId === instrumentId)?.units ?? 0,
    [holdings, instrumentId],
  );

  const isWithdrawal = requestType === 'Withdrawal';

  function validate(): Errors {
    const next: Errors = {};
    const amountValue = Number(amount);
    const unitsValue = units === '' ? null : Number(units);

    if (!instrumentId) {
      next.instrument = t('create.validation.instrument', { defaultValue: 'Select an instrument.' });
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      next.amount = t('create.validation.amount', { defaultValue: 'Amount must be greater than zero.' });
    } else if (instrument && amountValue < instrument.rule.minAmount) {
      next.amount = t('create.validation.amountMin', { defaultValue: "Amount is below this instrument's minimum." });
    } else if (instrument && amountValue > instrument.rule.maxAmount) {
      next.amount = t('create.validation.amountMax', { defaultValue: "Amount is above this instrument's maximum." });
    }

    if (isWithdrawal) {
      if (unitsValue === null || !Number.isFinite(unitsValue) || unitsValue <= 0) {
        next.units = t('create.validation.units', { defaultValue: 'Units are required for a withdrawal.' });
      } else if (instrument && unitsValue < instrument.rule.minUnits) {
        next.units = t('create.validation.unitsMin', { defaultValue: "Units are below this instrument's minimum." });
      } else if (unitsValue > heldUnits) {
        // An investor cannot sell units they do not hold.
        next.units = t('create.validation.unitsHeld', {
          held: formatUnits(heldUnits),
          defaultValue: `You hold only ${formatUnits(heldUnits)} units of this fund.`,
        });
      }
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDuplicateOf(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !accountId) return;

    setSubmitting(true);
    try {
      const result = await createRequest({
        requestType,
        investorAccountId: accountId as Guid,
        instrumentId: instrumentId as Guid,
        amount: Number(amount),
        // Units belong to a WITHDRAWAL only. This is the authoritative guard
        // rather than a second belt: clearing state on type-change fixes what
        // the user sees, but any other path that sets `units` — a deep link, a
        // future field, a restored draft — would otherwise leak it into a
        // deposit payload, and `validate()` never inspects units unless
        // isWithdrawal, so nothing downstream would catch it.
        units: isWithdrawal ? (units === '' ? null : Number(units)) : null,
      });

      if (result.deduplicated) {
        setDuplicateOf(result.request.requestNumber);
        setSubmitting(false);
        return;
      }

      router.push('/portal/requests');
    } catch {
      setSubmitting(false);
      setFailed(true);
    }
  }

  const loading = instruments === null;

  return (
    <PortalShell
      title={t('create.title', {
        defaultValue: 'Register a capital deposit or withdrawal request',
      })}
      description={
        account
          ? `${t('portal.investor', { defaultValue: 'Investor' })}: ${isFa ? account.fullNameFa : account.fullNameEn}`
          : t('portal.description', {
              defaultValue: 'Your holdings, requests and account movements at a glance.',
            })
      }
    >
      {failed || accountsFailed ? (
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>{t('error.title', { defaultValue: 'Could not load requests' })}</AlertTitle>
        </Alert>
      ) : null}

      {duplicateOf ? (
        <Alert variant="warning">
          <AlertIcon>
            <CircleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('create.duplicateTitle', { defaultValue: 'This request already exists' })}
          </AlertTitle>
          <AlertDescription>
            {t('create.duplicateBody', {
              number: duplicateOf,
              defaultValue: `An identical request already exists as ${duplicateOf}; nothing new was created.`,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('create.formTitle', { defaultValue: 'Request details' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>{t('create.type', { defaultValue: 'Request type' })}</Label>
                  <Select
                    value={requestType}
                    onValueChange={(v) => {
                      setRequestType(v as RequestType);
                      // The units field is UNMOUNTED for a deposit, not reset —
                      // React keeps the state of a control that stops being
                      // rendered. Without this, typing units on a withdrawal,
                      // switching to deposit and switching back shows the old
                      // value again, and (before the guard in handleSubmit) a
                      // deposit could be submitted carrying it.
                      setUnits('');
                      // The stale ERROR has to go too: it is invisible while
                      // the field is unmounted and reappears intact on the way
                      // back, complaining about a value the user can no longer
                      // see.
                      setErrors((prev) => ({ ...prev, units: undefined }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`type.${type}`, { defaultValue: type })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t('create.instrument', { defaultValue: 'Instrument' })}</Label>
                  <Select value={instrumentId} onValueChange={(v) => setInstrumentId(v as Guid)}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('create.instrumentPlaceholder', {
                          defaultValue: 'Select an instrument…',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {instruments!.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.symbol} — {isFa ? i.nameFa : i.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.instrument ? (
                    <p className="text-xs text-destructive">{errors.instrument}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t('create.amount', { defaultValue: 'Amount (IRR)' })}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('create.amountPlaceholder', { defaultValue: 'e.g. 500,000,000' })}
                  />
                  {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
                </div>

                {isWithdrawal ? (
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('create.units', { defaultValue: 'Units' })} *</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      placeholder={t('create.unitsPlaceholder', {
                        defaultValue: 'Required for a withdrawal',
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('portal.funds.units', { defaultValue: 'Units' })}: {formatUnits(heldUnits)}
                    </p>
                    {errors.units ? <p className="text-xs text-destructive">{errors.units}</p> : null}
                  </div>
                ) : null}
              </div>

              {instrument ? (
                <Alert>
                  <AlertIcon>
                    <Info />
                  </AlertIcon>
                  <AlertTitle>{t('create.rules', { defaultValue: 'Instrument rules' })}</AlertTitle>
                  <AlertDescription>
                    <span className="inline-flex flex-wrap gap-x-6 gap-y-1">
                      <span>
                        {t('create.rulesMin', { defaultValue: 'Minimum amount' })}:{' '}
                        {formatAmount(instrument.rule.minAmount)}
                      </span>
                      <span>
                        {t('create.rulesMax', { defaultValue: 'Maximum amount' })}:{' '}
                        {formatAmount(instrument.rule.maxAmount)}
                      </span>
                      <span>
                        {t('create.rulesCutOff', { defaultValue: 'Cut-off time' })}:{' '}
                        {instrument.rule.cutOffTime}
                      </span>
                      <span>
                        {t('create.rulesSettlement', { defaultValue: 'Settlement' })}:{' '}
                        {t('create.rulesSettlementValue', {
                          days: instrument.rule.settlementDays,
                          defaultValue: `T+${instrument.rule.settlementDays}`,
                        })}
                      </span>
                    </span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center gap-2.5">
                <Button type="submit" disabled={submitting || !accountId}>
                  {submitting
                    ? t('create.submitting', { defaultValue: 'Registering…' })
                    : t('create.submit', { defaultValue: 'Register request' })}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/portal">{t('create.cancel', { defaultValue: 'Cancel' })}</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
