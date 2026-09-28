'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChartLine,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  Gauge,
  Hand,
  Landmark,
  Mail,
  MessageSquare,
  Percent,
  RefreshCw,
  TriangleAlert,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { HEALTH_STATE_VARIANT, formatDateTime } from '../components/format';
import { SectionShell } from '../components/section-shell';
import { getServiceHealth } from '../components/spm-api';
import type {
  ExternalServiceHealth,
  ExternalServiceState,
  ExternalServiceType,
} from '../components/types';

/* ── static presentation maps ─────────────────────────────────────────────── */

/** Display order: the sequence a deposit actually travels through. */
const SERVICE_ORDER: ExternalServiceType[] = ['Oms', 'PaymentGateway', 'Bank', 'Sms', 'Email'];

const STATE_ORDER: ExternalServiceState[] = ['Healthy', 'Degraded', 'Down', 'Manual'];

const SERVICE_ICON: Record<ExternalServiceType, LucideIcon> = {
  Oms: ChartLine,
  PaymentGateway: CreditCard,
  Bank: Landmark,
  Sms: MessageSquare,
  Email: Mail,
};

const SERVICE_LABEL_FALLBACK: Record<ExternalServiceType, string> = {
  Oms: 'OMS (order management)',
  PaymentGateway: 'Payment gateway',
  Bank: 'Bank',
  Sms: 'SMS',
  Email: 'Email',
};

const STATE_ICON: Record<ExternalServiceState, LucideIcon> = {
  Healthy: CircleCheck,
  Degraded: TriangleAlert,
  Down: CircleX,
  Manual: Hand,
};

const STATE_LABEL_FALLBACK: Record<ExternalServiceState, string> = {
  Healthy: 'Healthy',
  Degraded: 'Degraded',
  Down: 'Down',
  Manual: 'Manual',
};

const STATE_HINT_FALLBACK: Record<ExternalServiceState, string> = {
  Healthy: 'The adapter responds inside its expected latency and error budget.',
  Degraded: 'The adapter responds, but slowly or with elevated failures — expect delays.',
  Down: 'The adapter cannot be reached; every step that depends on it is blocked.',
  Manual: 'No adapter is configured. An operator performs this step by hand.',
};

/* ── value formatting ─────────────────────────────────────────────────────── */

function formatLatency(latencyMs: number | null): string {
  if (latencyMs === null) return '—';
  return `${latencyMs.toLocaleString('en-US')} ms`;
}

/**
 * The backend may express the rate either as a 0–1 ratio or as a 0–100
 * percentage; normalise both to a percentage so the card never shows "0.9%"
 * when it means 90%.
 */
function successRatePercent(successRate24h: number | null): number | null {
  if (successRate24h === null) return null;
  return successRate24h <= 1 ? successRate24h * 100 : successRate24h;
}

function formatSuccessRate(successRate24h: number | null): string {
  const percent = successRatePercent(successRate24h);
  if (percent === null) return '—';
  return `${percent.toFixed(1)}%`;
}

/* ── small building blocks ────────────────────────────────────────────────── */

interface MetricRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function MetricRow({ icon: Icon, label, value }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function HealthCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-7 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */

export function HealthContent() {
  const { t } = useTranslation('spm-health');

  const [services, setServices] = useState<ExternalServiceHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getServiceHealth()
      .then((rows) => {
        if (cancelled) return;
        setServices(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const ordered = useMemo(
    () =>
      [...services].sort(
        (a, b) => SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service),
      ),
    [services],
  );

  const manualCount = useMemo(
    () => ordered.filter((row) => row.state === 'Manual').length,
    [ordered],
  );

  const refreshAction = (
    <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
      <RefreshCw className={loading ? 'animate-spin' : undefined} />
      {t('actions.refresh', { defaultValue: 'Re-check' })}
    </Button>
  );

  return (
    <SectionShell
      title={t('title', { defaultValue: 'External service health' })}
      description={t('toolbar.description', {
        defaultValue:
          'Connection state of every external system the portfolio flow depends on.',
      })}
      actions={refreshAction}
    >
      {/* Manual-mode notice — the single most important fact on this screen. */}
      <Alert variant="warning" appearance="light" size="lg">
        <AlertIcon>
          <Unplug />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>
            {t('notice.title', { defaultValue: 'Integrations are not connected yet' })}
          </AlertTitle>
          <AlertDescription>
            {t('notice.body', {
              defaultValue:
                'No adapter is configured for these external systems, so nothing is polled automatically. Every step below — placing the order, taking the payment, confirming the bank transfer, notifying the investor — is performed by an operator by hand and recorded in the system afterwards. Cards drawn with a dashed border are in that manual mode.',
            })}
          </AlertDescription>
          {!loading && !error && ordered.length > 0 ? (
            <p className="text-sm font-medium">
              {t('notice.counter', {
                defaultValue: '{{manual}} of {{total}} services are handled manually.',
                manual: manualCount,
                total: ordered.length,
              })}
            </p>
          ) : null}
        </AlertContent>
      </Alert>

      {error ? (
        <Alert variant="destructive" appearance="light" size="lg">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>
              {t('error.title', { defaultValue: 'Could not load service health' })}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-7.5">
          {SERVICE_ORDER.map((service) => (
            <HealthCardSkeleton key={service} />
          ))}
        </div>
      ) : null}

      {!loading && !error && ordered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {t('empty.title', { defaultValue: 'No external services registered' })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('empty.description', {
                defaultValue:
                  'Nothing is being monitored yet. Services appear here once the SPM service registers them.',
              })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && ordered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-7.5">
          {ordered.map((row) => {
            const ServiceIcon = SERVICE_ICON[row.service];
            const StateIcon = STATE_ICON[row.state];
            const isManual = row.state === 'Manual';
            const ratePercent = successRatePercent(row.successRate24h);

            return (
              <Card key={row.service} className={isManual ? 'border-2 border-dashed' : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <ServiceIcon className="size-4.5" />
                    </span>
                    <span>
                      {t(`services.${row.service}`, {
                        defaultValue: SERVICE_LABEL_FALLBACK[row.service],
                      })}
                    </span>
                  </CardTitle>
                  <Badge
                    variant={HEALTH_STATE_VARIANT[row.state]}
                    appearance="light"
                    size="lg"
                    className="h-8 px-3 text-sm"
                  >
                    <StateIcon />
                    {t(`states.${row.state}`, { defaultValue: STATE_LABEL_FALLBACK[row.state] })}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <MetricRow
                    icon={Clock}
                    label={t('card.lastChecked', { defaultValue: 'Last checked' })}
                    value={formatDateTime(row.lastCheckedAt)}
                  />
                  <MetricRow
                    icon={Gauge}
                    label={t('card.latency', { defaultValue: 'Latency' })}
                    value={formatLatency(row.latencyMs)}
                  />
                  <MetricRow
                    icon={Percent}
                    label={t('card.successRate', { defaultValue: 'Success rate (24h)' })}
                    value={formatSuccessRate(row.successRate24h)}
                  />
                  {ratePercent !== null ? <Progress value={ratePercent} /> : null}

                  <Separator />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('card.note', { defaultValue: 'Note' })}
                    </p>
                    <p className="mt-1 text-sm text-foreground">{row.note}</p>
                  </div>

                  {isManual ? (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                      <Hand className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        {t('card.manualHint', {
                          defaultValue:
                            'No adapter configured — an operator performs this step by hand.',
                        })}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Legend — what the four states mean. */}
      <Card>
        <CardHeader>
          <CardTitle>{t('legend.title', { defaultValue: 'What the states mean' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {STATE_ORDER.map((state) => {
              const StateIcon = STATE_ICON[state];
              return (
                <div
                  key={state}
                  className={
                    'rounded-lg border p-3 ' +
                    (state === 'Manual' ? 'border-2 border-dashed' : 'border-border')
                  }
                >
                  <Badge variant={HEALTH_STATE_VARIANT[state]} appearance="light" size="lg">
                    <StateIcon />
                    {t(`states.${state}`, { defaultValue: STATE_LABEL_FALLBACK[state] })}
                  </Badge>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(`stateHints.${state}`, { defaultValue: STATE_HINT_FALLBACK[state] })}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
