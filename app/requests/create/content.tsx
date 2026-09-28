'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { SectionShell } from '../../components/section-shell';
import { formatAmount, formatUnits } from '../../components/format';
import { createRequest, getAccounts, getInstruments } from '../../components/spm-api';
import type {
  Guid,
  Instrument,
  InvestorAccount,
  RequestType,
} from '../../components/types';

const REQUEST_TYPES: RequestType[] = ['Deposit', 'Withdrawal'];

/** Field-level messages, keyed by the field they belong to. */
type Errors = Partial<Record<'investor' | 'instrument' | 'amount' | 'units', string>>;

export function RequestCreateContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';
  const router = useRouter();

  const [accounts, setAccounts] = useState<InvestorAccount[] | null>(null);
  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [requestType, setRequestType] = useState<RequestType>('Deposit');
  const [investorId, setInvestorId] = useState<Guid | ''>('');
  const [instrumentId, setInstrumentId] = useState<Guid | ''>('');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getAccounts(), getInstruments()])
      .then(([a, i]) => {
        if (!alive) return;
        setAccounts(a.filter((x) => x.isActive));
        setInstruments(i.filter((x) => x.isActive));
      })
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const instrument = useMemo(
    () => instruments?.find((i) => i.id === instrumentId) ?? null,
    [instruments, instrumentId],
  );

  const isWithdrawal = requestType === 'Withdrawal';

  /**
   * Validated here so the operator sees the instrument's own limits before
   * submitting. The real service re-checks all of this — a browser check is a
   * convenience, never the guarantee.
   */
  function validate(): Errors {
    const next: Errors = {};
    const amountValue = Number(amount);
    const unitsValue = units === '' ? null : Number(units);

    if (!investorId) next.investor = t('create.validation.investor', { defaultValue: 'Select an investor.' });
    if (!instrumentId) next.instrument = t('create.validation.instrument', { defaultValue: 'Select an instrument.' });

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
      }
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDuplicateOf(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await createRequest({
        requestType,
        investorAccountId: investorId as Guid,
        instrumentId: instrumentId as Guid,
        amount: Number(amount),
        // Units belong to a WITHDRAWAL only. Without this, typing units, then
        // switching the type to Deposit, submits a deposit carrying them —
        // `validate()` only inspects units when isWithdrawal, so nothing
        // downstream catches it. The portal twin carries the same guard.
        units: isWithdrawal ? (units === '' ? null : Number(units)) : null,
      });

      // §13-5: an identical submission returns the original rather than
      // creating a second request. Say so instead of pretending it was created.
      if (result.deduplicated) {
        setDuplicateOf(result.request.requestNumber);
        setSubmitting(false);
        return;
      }

      router.push(`/requests/${result.request.id}`);
    } catch {
      setSubmitting(false);
      setLoadFailed(true);
    }
  }

  const loading = accounts === null || instruments === null;

  return (
    <SectionShell
      title={t('create.title', { defaultValue: 'Register a capital deposit or withdrawal request' })}
      description={t('create.description', {
        defaultValue: "Register a deposit or withdrawal on an investor's behalf.",
      })}
      actions={
        <Button variant="outline" asChild>
          <Link href="/requests">{t('create.cancel', { defaultValue: 'Cancel' })}</Link>
        </Button>
      }
    >
      {loadFailed ? (
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
                      // Drop a STALE units error, but deliberately NOT the
                      // units value — unlike the portal form, this one renders
                      // the units Input unconditionally (the label merely gains
                      // a ' *' when isWithdrawal). Clearing a field the
                      // operator can see would delete something they typed;
                      // clearing the error only removes a message that
                      // `validate()` can no longer produce, since it inspects
                      // units solely when isWithdrawal.
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
                  <p className="text-xs text-muted-foreground">
                    {t('create.typeHint', {
                      defaultValue:
                        'Deposit brings capital in and buys units; withdrawal sells units and pays capital out.',
                    })}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t('create.investor', { defaultValue: 'Investor' })}</Label>
                  <Select value={investorId} onValueChange={(v) => setInvestorId(v as Guid)}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('create.investorPlaceholder', {
                          defaultValue: 'Select an investor…',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts!.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {isFa ? a.fullNameFa : a.fullNameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.investor ? (
                    <p className="text-xs text-destructive">{errors.investor}</p>
                  ) : null}
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

                <div className="flex flex-col gap-1.5">
                  <Label>
                    {t('create.units', { defaultValue: 'Units' })}
                    {isWithdrawal ? ' *' : ''}
                  </Label>
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
                    {t('create.unitsHint', {
                      defaultValue: 'For a withdrawal, the number of units to be sold.',
                    })}
                  </p>
                  {errors.units ? <p className="text-xs text-destructive">{errors.units}</p> : null}
                </div>
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
                      <span>
                        {t('create.units', { defaultValue: 'Units' })}:{' '}
                        {formatUnits(instrument.rule.minUnits)}
                      </span>
                    </span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center gap-2.5">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? t('create.submitting', { defaultValue: 'Registering…' })
                    : t('create.submit', { defaultValue: 'Register request' })}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/requests">{t('create.cancel', { defaultValue: 'Cancel' })}</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
