'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, FileQuestion, Info, TriangleAlert } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { PortalShell } from '../../components/portal-shell';
import { getInstrument } from '../../../components/spm-api';
import type { Instrument } from '../../../components/types';

/**
 * Investor portal — one fund, in full (proposal §6-1 item 2, the «جزئیات هر یک»
 * half that the funds table could only gesture at until this route existed).
 *
 * WHY THE NUMBERS ARE FORMATTED HERE AND NOT IN `format.ts`
 * `formatAmount`/`formatUnits` hardcode 'en-US', so they always emit Latin
 * digits. That is right for the operator console and wrong for an investor
 * reading a Persian fund page, where money and percentages are expected in
 * Persian digits. Changing the shared helpers would restyle every number on all
 * seventeen screens that import them — a zone-wide decision, not a page one. So
 * this page carries its own locale-aware pair, built on the same
 * `toLocaleString` mechanism `format.ts` already uses for dates, and the shared
 * helpers are left untouched. When the zone unifies, these two go away.
 *
 * Note `startsWith('fa')` rather than `=== 'fa'`: eleven call sites in this app
 * use strict equality, so a browser reporting `fa-IR` makes them silently fall
 * back to English while dates stay Persian. `format.ts` already gets this right;
 * this page follows `format.ts`, not its neighbours.
 */

/** Rials, in the digits of the active language. */
function localeAmount(value: number, fa: boolean): string {
  return value.toLocaleString(fa ? 'fa-IR' : 'en-US');
}

/**
 * A percentage, signed. There is no shared percent helper in this codebase —
 * `fillPercent` returns a bare number and every caller appends '%' itself — so
 * this is genuinely new rather than a duplicate of something that exists.
 */
function localePercent(value: number, fa: boolean): string {
  const n = value.toLocaleString(fa ? 'fa-IR' : 'en-US', { maximumFractionDigits: 2 });
  return fa ? `${n}٪` : `${n}%`;
}

/**
 * Persian digits inside a string that is NOT a number and cannot go through
 * `toLocaleString` — the cut-off time '12:30' arrives as a raw string, and the
 * T+n settlement label is built by i18next interpolation, which stringifies
 * without Intl.
 *
 * Without this the rules card renders Persian amounts directly above Latin
 * '500', '12:00' and 'T+2' — the exact split-digit inconsistency this page
 * exists to avoid. There IS a `localizeDigits` in lib/format-utils.ts, but it
 * is dead code with no importers and it keys off the literal 'fa-IR' rather
 * than the 'fa' that `i18n.language` actually holds, so it would no-op here.
 */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function localeDigits(value: string, fa: boolean): string {
  return fa ? value.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]) : value;
}

/**
 * A numeral inside RTL prose. Bidi reordering can flip a grouped or
 * slash-joined number; the operator console wraps its figures for exactly this
 * reason (accounts, ledger and instruments all do it) and the portal so far
 * does not. Only the numeral goes inside — a currency word beside it must stay
 * in the RTL flow, or it lands on the wrong side.
 */
function Num({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="inline-block tabular-nums">
      {children}
    </span>
  );
}

function BackButton() {
  const { t } = useTranslation('spm-requests');
  return (
    <Button variant="outline" asChild>
      <Link href="/portal/instruments">
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t('portal.fund.back', { defaultValue: 'All funds' })}
      </Link>
    </Button>
  );
}

export function PortalFundDetailContent() {
  const { t } = useTranslation('spm-requests');

  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const shellTitle = t('portal.fund.title', { defaultValue: 'Fund' });
  const shellDescription = t('portal.fund.description', {
    defaultValue: 'Fund profile, pricing and rules.',
  });

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <PortalShell title={shellTitle} description={shellDescription} actions={<BackButton />}>
        <Card>
          <CardHeader>
            <CardTitle>{t('portal.fund.loading', { defaultValue: 'Loading fund…' })}</CardTitle>
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
      </PortalShell>
    );
  }

  /* ── error ──────────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <PortalShell title={shellTitle} description={shellDescription} actions={<BackButton />}>
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

  /* ── not found ──────────────────────────────────────────────────────────── */
  // `getInstrument` RESOLVES null for an unknown id rather than throwing, which
  // is why this is a branch on the value and not a second catch.
  if (!instrument) {
    return (
      <PortalShell title={shellTitle} description={shellDescription} actions={<BackButton />}>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileQuestion className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {t('portal.fund.notFound', { defaultValue: 'No such fund' })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('portal.fund.notFoundBody', {
                defaultValue: 'This fund is not in the catalogue.',
              })}
            </p>
            {id ? <p className="font-mono text-xs text-muted-foreground">{id}</p> : null}
            <div className="mt-2">
              <BackButton />
            </div>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  return <FundDetail instrument={instrument} />;
}

/* ── the loaded screen ────────────────────────────────────────────────────── */

function FundDetail({ instrument }: { instrument: Instrument }) {
  const { t, i18n } = useTranslation('spm-requests');
  const fa = i18n.language?.toLowerCase().startsWith('fa') ?? false;

  const p = instrument.profile;
  const name = fa ? instrument.nameFa : instrument.nameEn;
  const currency = t('portal.fund.currency', { defaultValue: 'IRR' });
  const highlightTitle = fa ? p.highlight.titleFa : p.highlight.titleEn;

  const stats = [
    {
      key: 'annualYield',
      label: t('portal.fund.annualYield', { defaultValue: 'Effective annual yield' }),
      hint: t('portal.fund.annualYieldHint', {
        defaultValue:
          'The annualised rate the fund is currently returning. Not a guarantee of future performance.',
      }),
      value: p.annualYieldPct,
    },
    {
      key: 'monthlyReturn',
      label: t('portal.fund.monthlyReturn', { defaultValue: 'Past one-month return' }),
      hint: '',
      value: p.monthlyReturnPct,
    },
    {
      key: 'yearlyReturn',
      label: t('portal.fund.yearlyReturn', { defaultValue: 'Past one-year return' }),
      hint: '',
      value: p.yearlyReturnPct,
    },
  ];

  const facts = [
    {
      key: 'registration',
      label: t('portal.fund.registrationNumber', { defaultValue: 'Registration number' }),
      value: p.registrationNumber,
      numeric: true,
    },
    {
      key: 'guarantor',
      label: t('portal.fund.guarantor', { defaultValue: 'Liquidity guarantor' }),
      value: fa ? p.guarantorNameFa : p.guarantorNameEn,
      numeric: false,
    },
    {
      key: 'manager',
      label: t('portal.fund.manager', { defaultValue: 'Fund manager' }),
      value: fa ? p.managerNameFa : p.managerNameEn,
      numeric: false,
    },
    {
      key: 'custodian',
      label: t('portal.fund.custodian', { defaultValue: 'Custodian' }),
      value: fa ? p.custodianNameFa : p.custodianNameEn,
      numeric: false,
    },
    {
      key: 'workingDays',
      label: t('portal.fund.workingDays', { defaultValue: 'Working days' }),
      value: fa ? p.workingDaysFa : p.workingDaysEn,
      numeric: false,
    },
  ];

  return (
    <PortalShell
      title={name}
      description={t('portal.fund.description', {
        defaultValue: 'Fund profile, pricing and rules.',
      })}
      actions={<BackButton />}
    >
      {/*
        1 · hero. A plain div, NOT a Card, and the gradient is an inline style.
        PortalShell tints every descendant `div.rounded-xl.bg-card` with an
        !important emerald wash, which a Card-level class cannot outrank — so a
        Card here would fight the shell and lose. FundCards in widgets.tsx sets
        the same precedent for a coloured panel inside the portal.
      */}
      <div
        className="flex flex-col gap-4 rounded-xl p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)' }}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" appearance="light" size="sm">
              {instrument.symbol}
            </Badge>
            {!instrument.isActive ? (
              <Badge variant="warning" appearance="light" size="sm">
                {t('portal.fund.closed', { defaultValue: 'Closed to new business' })}
              </Badge>
            ) : null}
          </div>
          <p className="max-w-xl text-lg font-semibold leading-relaxed text-white">
            {fa ? p.headlineFa : p.headlineEn}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/10 px-6 py-4 text-center">
          <p className="text-xs text-emerald-50/80">
            {t('portal.fund.annualYield', { defaultValue: 'Effective annual yield' })}
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            <Num>{localePercent(p.annualYieldPct, fa)}</Num>
          </p>
        </div>
      </div>

      {/* 2 · capital management + stats */}
      <div className="grid gap-5 lg:grid-cols-5 lg:gap-7.5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {t('portal.fund.capitalTitle', { defaultValue: 'Capital management' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PriceRow
              label={t('portal.fund.unitPrice', { defaultValue: 'Approximate price per unit' })}
              amount={localeAmount(instrument.navIssue, fa)}
              currency={currency}
              action={
                <ActionButton
                  active={instrument.isActive}
                  href={`/portal/instruments/${instrument.id}/issuance`}
                  label={t('portal.fund.invest', { defaultValue: 'Invest' })}
                />
              }
            />
            <PriceRow
              label={t('portal.fund.unitPrice', { defaultValue: 'Approximate price per unit' })}
              amount={localeAmount(instrument.navRedeem, fa)}
              currency={currency}
              action={
                <ActionButton
                  active={instrument.isActive}
                  href={`/portal/new-request?instrumentId=${instrument.id}&type=Withdrawal`}
                  label={t('portal.fund.withdraw', { defaultValue: 'Withdraw' })}
                  variant="destructive"
                />
              }
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="py-2">
            <dl className="divide-y divide-border">
              {stats.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4 py-4">
                  <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {s.label}
                    {s.hint ? (
                      <span title={s.hint} className="inline-flex">
                        <Info className="size-3.5 shrink-0 opacity-70" />
                      </span>
                    ) : null}
                  </dt>
                  <dd
                    className={
                      s.value < 0
                        ? 'text-base font-semibold text-destructive'
                        : 'text-base font-semibold text-emerald-700 dark:text-emerald-400'
                    }
                  >
                    <Num>{localePercent(s.value, fa)}</Num>
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-muted-foreground">
                  {t('portal.fund.profitDistribution', { defaultValue: 'Profit distribution' })}
                </dt>
                <dd className="text-base font-semibold">
                  {fa ? p.profitDistributionFa : p.profitDistributionEn}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 3 · optional promoted feature — renders nothing when the fund has none */}
      {highlightTitle ? (
        <Card>
          <CardHeader>
            <CardTitle>{highlightTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {fa ? p.highlight.bodyFa : p.highlight.bodyEn}
            </p>
            <p className="border-s-2 border-emerald-500 ps-3 text-sm font-medium">
              {fa ? p.highlight.calloutFa : p.highlight.calloutEn}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* 4 · about */}
      <Card>
        <CardHeader>
          <CardTitle>{t('portal.fund.about', { defaultValue: 'About the fund' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{fa ? p.aboutFa : p.aboutEn}</p>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.key} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium">
                  {f.numeric ? <Num>{f.value}</Num> : f.value}
                </dd>
              </div>
            ))}
          </dl>
          {p.websiteUrl ? (
            <a
              href={p.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {t('portal.fund.website', { defaultValue: 'Fund website' })}
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </CardContent>
      </Card>

      {/* 5 · rules — the seeded FAQ copy points at this section by name */}
      <Card>
        <CardHeader>
          <CardTitle>{t('portal.fund.rules', { defaultValue: 'Fund rules' })}</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <dl className="divide-y divide-border">
            <RuleRow
              label={t('create.rulesMin', { defaultValue: 'Minimum amount' })}
              value={`${localeAmount(instrument.rule.minAmount, fa)} ${currency}`}
            />
            <RuleRow
              label={t('create.rulesMax', { defaultValue: 'Maximum amount' })}
              value={`${localeAmount(instrument.rule.maxAmount, fa)} ${currency}`}
            />
            <RuleRow
              label={t('portal.funds.units', { defaultValue: 'Units' })}
              value={localeAmount(instrument.rule.minUnits, fa)}
            />
            <RuleRow
              label={t('create.rulesCutOff', { defaultValue: 'Cut-off time' })}
              value={localeDigits(instrument.rule.cutOffTime, fa)}
            />
            <RuleRow
              label={t('create.rulesSettlement', { defaultValue: 'Settlement' })}
              value={localeDigits(
                t('create.rulesSettlementValue', {
                  days: instrument.rule.settlementDays,
                  defaultValue: `T+${instrument.rule.settlementDays}`,
                }),
                fa,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      {/* 6 · FAQ — variant and indicator are ROOT-ONLY; children read them from context */}
      {p.faq.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('portal.fund.faq', { defaultValue: 'Frequently asked' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible variant="outline" indicator="arrow">
              {p.faq.map((item, index) => (
                <AccordionItem key={item.questionEn} value={`faq-${index}`}>
                  <AccordionTrigger>{fa ? item.questionFa : item.questionEn}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {fa ? item.answerFa : item.answerEn}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ) : null}
    </PortalShell>
  );
}

/**
 * Invest / Withdraw. A closed fund gets a disabled button rather than a dead
 * link: `/portal/new-request` filters its instrument list to `isActive`, so a
 * link carrying a closed fund's id would land on a form where that fund cannot
 * be selected at all. Better to say no here than to strand the investor there.
 *
 * `disabled` cannot ride on `asChild` — the Slot would spread it onto an <a>,
 * where it means nothing — so the two cases are genuinely different elements.
 */
function ActionButton({
  active,
  href,
  label,
  variant,
}: {
  active: boolean;
  href: string;
  label: string;
  variant?: 'destructive';
}) {
  // Issue is green, redemption is red — the pairing investors already read on
  // every Iranian fund portal. The kit's Button has no `success` variant (its
  // variants are primary|mono|destructive|secondary|outline|dashed|ghost|dim|
  // foreground|inverse), and adding one would be a change to a shared component
  // for one page's sake, so the green is a className on this call site only.
  const green = variant ? undefined : 'bg-emerald-600 text-white hover:bg-emerald-700';

  if (!active) {
    return (
      <Button variant={variant} disabled>
        {label}
      </Button>
    );
  }
  return (
    <Button variant={variant} className={green} asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function PriceRow({
  label,
  amount,
  currency,
  action,
}: {
  label: string;
  amount: string;
  currency: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-4">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">
          <Num>{amount}</Num> <span className="text-sm font-normal">{currency}</span>
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">
        <Num>{value}</Num>
      </dd>
    </div>
  );
}
