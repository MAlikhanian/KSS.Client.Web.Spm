'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CircleAlert, FileQuestion, Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { PortalShell } from '../../../components/portal-shell';
import { usePortalInvestor } from '../../../components/use-portal-investor';
import { createRequest, getInstrument } from '../../../../components/spm-api';
import type { Guid, Instrument, RequestStatus } from '../../../../components/types';

/**
 * Investor portal — issue units in ONE fund («درخواست صدور»).
 *
 * Deliberately not a variant of `/portal/new-request`. That form asks three
 * questions (which fund, deposit or withdrawal, how much) and is the general
 * entry point from the nav. This page is reached from a fund, so the fund is
 * already decided and the only question left is the amount — which is why the
 * instrument Select is absent rather than merely pre-filled.
 *
 * ON THE MISSING PAYMENT-GATEWAY FIELD
 * The reference flow this page is modelled on ends with a «انتخاب درگاه پرداخت»
 * picker. There is deliberately none here, and it is not an omission to be
 * filled in later by whoever reads this next. SPM has no PSP: `MOCK_HEALTH`
 * records `PaymentGateway` as state 'Manual' with the note "No PSP selected yet
 * (client prerequisite) — payments entered manually", and `CreateRequestInput`
 * has no gateway field to carry a choice even if one were made. A dropdown here
 * would be options wired to nothing, telling an investor this platform can take
 * an online card payment. It cannot, yet. The request lands at
 * `AwaitingPayment` and an operator arranges settlement, which is what the
 * pipeline on the right says, truthfully.
 */

/**
 * The real deposit pipeline, straight off the `RequestStatus` union — not the
 * reference site's seven invented steps. Labels come from the `status` group
 * that this namespace already ships in both languages, so the stepper stays
 * correct as the backend lands instead of drifting from it.
 */
const DEPOSIT_PIPELINE: RequestStatus[] = [
  'Submitted',
  'Validated',
  'AwaitingPayment',
  'Paid',
  'OrderPlaced',
  'Filled',
  'Settled',
];

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function localeAmount(value: number, fa: boolean): string {
  return value.toLocaleString(fa ? 'fa-IR' : 'en-US');
}

function localeDigits(value: string, fa: boolean): string {
  return fa ? value.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]) : value;
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="inline-block tabular-nums">
      {children}
    </span>
  );
}

export function PortalIssuanceContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const fa = i18n.language?.toLowerCase().startsWith('fa') ?? false;

  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const { accountId, failed: accountsFailed } = usePortalInvestor();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInstrument(id)
      .then((found) => {
        if (!cancelled) setInstrument(found);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const shellDescription = t('portal.issuance.description', {
    defaultValue: 'Buy units in this fund.',
  });

  const back = (
    <Button variant="outline" asChild>
      <Link href={`/portal/instruments/${id}`}>
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t('portal.issuance.backToFund', { defaultValue: 'Back to fund' })}
      </Link>
    </Button>
  );

  if (loading) {
    return (
      <PortalShell
        title={t('portal.issuance.title', { defaultValue: 'Issue units' })}
        description={shellDescription}
        actions={back}
      >
        <Card>
          <CardContent className="py-6">
            <div className="grid gap-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell
        title={t('portal.issuance.title', { defaultValue: 'Issue units' })}
        description={shellDescription}
        actions={back}
      >
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('portal.fund.error', { defaultValue: 'Could not load the fund' })}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PortalShell>
    );
  }

  if (!instrument) {
    return (
      <PortalShell
        title={t('portal.issuance.title', { defaultValue: 'Issue units' })}
        description={shellDescription}
        actions={back}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileQuestion className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {t('portal.fund.notFound', { defaultValue: 'No such fund' })}
            </p>
            {id ? <p className="font-mono text-xs text-muted-foreground">{id}</p> : null}
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  const name = fa ? instrument.nameFa : instrument.nameEn;
  const rule = instrument.rule;

  /**
   * Approximate only, and labelled as such on screen. The units an investor
   * actually receives are struck at the next business day's NAV, which does not
   * exist yet at the moment this form is filled in — so this is the current
   * issue price used as an estimate, never a quote.
   */
  const amountValue = Number(amount);
  const amountIsUsable = amount !== '' && Number.isFinite(amountValue) && amountValue > 0;
  const approxUnits = amountIsUsable ? Math.floor(amountValue / instrument.navIssue) : null;

  function validate(): string | null {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return t('create.validation.amount', {
        defaultValue: 'Amount must be greater than zero.',
      });
    }
    if (amountValue < rule.minAmount) {
      return t('create.validation.amountMin', {
        defaultValue: "Amount is below this instrument's minimum.",
      });
    }
    if (amountValue > rule.maxAmount) {
      return t('create.validation.amountMax', {
        defaultValue: "Amount is above this instrument's maximum.",
      });
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDuplicateOf(null);

    const problem = validate();
    setAmountError(problem);
    if (problem || !accountId || !instrument) return;

    setSubmitting(true);
    try {
      const result = await createRequest({
        requestType: 'Deposit',
        investorAccountId: accountId as Guid,
        instrumentId: instrument.id as Guid,
        amount: amountValue,
        // A deposit is priced in rials; units are struck later at the fund's
        // NAV, so nothing is sent here. The estimate above is display only.
        units: null,
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

  const closed = !instrument.isActive;

  return (
    <PortalShell
      title={t('portal.issuance.titleFor', {
        fund: name,
        defaultValue: `Issue units — ${name}`,
      })}
      description={shellDescription}
      actions={back}
    >
      {failed || accountsFailed ? (
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('error.title', { defaultValue: 'Could not load requests' })}
          </AlertTitle>
        </Alert>
      ) : null}

      {duplicateOf ? (
        <Alert variant="warning" appearance="light">
          <AlertIcon>
            <CircleAlert />
          </AlertIcon>
          <AlertTitle>
            {t('create.duplicateTitle', { defaultValue: 'This request already exists' })}
          </AlertTitle>
          <AlertDescription>
            {t('create.duplicateBody', {
              number: duplicateOf,
              defaultValue: `An identical request was already submitted as ${duplicateOf}.`,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {/*
        Column order follows the reference: the stepper sits on the RIGHT and
        the form on the LEFT. Under RTL the first child renders rightmost, so
        the stepper is declared first — reversing these two swaps the sides.
      */}
      <div className="grid gap-5 lg:grid-cols-5 lg:gap-7.5">
        {/* the form */}
        <Card className="lg:col-span-3 lg:order-2">
          <CardHeader>
            <CardTitle>
              {t('portal.issuance.formTitle', {
                fund: name,
                defaultValue: `Request to issue units of ${name}`,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="warning" appearance="light" className="mb-5">
              <AlertIcon>
                <Info />
              </AlertIcon>
              <AlertDescription>
                {t('portal.issuance.notice', {
                  cutOff: localeDigits(rule.cutOffTime, fa),
                  days: fa ? instrument.profile.workingDaysFa : instrument.profile.workingDaysEn,
                  defaultValue: `Requests registered before ${localeDigits(rule.cutOffTime, fa)} on a business day are processed the same day; later ones roll to the next. Working days: ${fa ? instrument.profile.workingDaysFa : instrument.profile.workingDaysEn}.`,
                })}
              </AlertDescription>
            </Alert>

            {closed ? (
              <Alert variant="destructive" appearance="light" className="mb-5">
                <AlertIcon>
                  <TriangleAlert />
                </AlertIcon>
                <AlertDescription>
                  {t('portal.issuance.closed', {
                    defaultValue: 'This fund is closed to new business — units cannot be issued.',
                  })}
                </AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="issuance-amount">
                  {t('create.amount', { defaultValue: 'Amount' })} *
                </Label>
                <Input
                  id="issuance-amount"
                  inputMode="numeric"
                  dir="ltr"
                  disabled={closed || submitting}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^0-9]/g, ''));
                    setAmountError(null);
                  }}
                  placeholder={t('create.amountPlaceholder', { defaultValue: 'Amount in rials' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('portal.issuance.minAmount', {
                    amount: localeAmount(rule.minAmount, fa),
                    currency: t('portal.fund.currency', { defaultValue: 'IRR' }),
                    defaultValue: `Minimum ${localeAmount(rule.minAmount, fa)} IRR`,
                  })}
                </p>
                {amountError ? <p className="text-xs text-destructive">{amountError}</p> : null}
              </div>

              {/* the two read-only boxes, as on the reference */}
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyBox
                  label={t('portal.fund.unitPrice', {
                    defaultValue: 'Approximate price per unit',
                  })}
                  value={localeAmount(instrument.navIssue, fa)}
                />
                <ReadOnlyBox
                  label={t('portal.issuance.approxUnits', {
                    defaultValue: 'Approximate units',
                  })}
                  value={approxUnits === null ? '—' : localeAmount(approxUnits, fa)}
                  muted
                />
              </div>

              {/*
                Same green as the Invest button that leads here — one action,
                one colour. The green is applied ONLY while the button is live:
                a flat `bg-emerald-600` outranks the kit's disabled styling, so
                a closed fund would render a bright, healthy-looking button that
                silently does nothing. Looking disabled matters as much as being
                disabled.
              */}
              <Button
                type="submit"
                disabled={closed || submitting}
                className={cn(
                  'w-full',
                  !closed && !submitting && 'bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                {submitting
                  ? t('create.submitting', { defaultValue: 'Submitting…' })
                  : t('portal.issuance.submit', { defaultValue: 'Confirm and continue' })}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* what happens next — SPM's real status pipeline */}
        <Card className="lg:col-span-2 lg:order-1">
          <CardHeader>
            <CardTitle>
              {t('portal.issuance.stepsTitle', { defaultValue: 'What happens next' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              {DEPOSIT_PIPELINE.map((status, index) => (
                <li key={status} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                    <Num>{localeDigits(String(index + 1), fa)}</Num>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(`status.${status}`)}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t(`portal.issuance.step.${status}`, { defaultValue: '' })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/*
              Says plainly why there is no gateway picker. The investor is told
              what will actually happen instead of being shown a control that
              would not work.
            */}
            <Alert variant="secondary" appearance="light" className="mt-5">
              <AlertIcon>
                <Info />
              </AlertIcon>
              <AlertDescription>
                {t('portal.issuance.paymentNote', {
                  defaultValue:
                    'Online payment is not enabled yet. After you submit, the request waits at “Awaiting payment” and payment instructions are arranged with you directly.',
                })}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}

function ReadOnlyBox({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={muted ? 'mt-1 text-sm font-medium text-muted-foreground' : 'mt-1 text-sm font-semibold'}>
        <Num>{value}</Num>
      </p>
    </div>
  );
}
