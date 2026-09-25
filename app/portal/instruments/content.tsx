'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PortalShell } from '../components/portal-shell';
import { NewRequestButton } from '../components/widgets';
import { formatAmount, formatUnits } from '../../components/format';
import { getInstruments } from '../../components/spm-api';
import type { Instrument } from '../../components/types';

/**
 * Investor portal — the funds available to invest in (proposal §6-1 item 2:
 * «مشاهده ابزارهای سرمایه‌گذاری قابل ارائه و جزئیات هر یک»).
 *
 * Shows only ACTIVE instruments: an investor should not be offered a fund that
 * is closed to new business. The operator console's own instruments screen shows
 * every instrument including inactive ones, which is the correct difference
 * between the two audiences.
 */
export function PortalInstrumentsContent() {
  const { t, i18n } = useTranslation('spm-requests');
  const isFa = i18n.language === 'fa';

  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getInstruments()
      .then((all) => alive && setInstruments(all.filter((i) => i.isActive)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PortalShell
      title={t('portal.nav.instruments', { defaultValue: 'Funds' })}
      description={t('portal.description', {
        defaultValue: 'Your holdings, requests and account movements at a glance.',
      })}
      actions={<NewRequestButton />}
    >
      {failed ? (
        <Alert variant="destructive">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertTitle>{t('error.title', { defaultValue: 'Could not load requests' })}</AlertTitle>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('portal.nav.instruments', { defaultValue: 'Funds' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {instruments === null ? (
            <Skeleton className="h-40 w-full" />
          ) : instruments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('portal.requests.empty', { defaultValue: 'No results found.' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('portal.requests.fund', { defaultValue: 'Fund' })}</TableHead>
                  <TableHead>{t('create.instrument', { defaultValue: 'Instrument' })}</TableHead>
                  <TableHead>{t('portal.funds.navIssue', { defaultValue: 'Issue NAV' })}</TableHead>
                  <TableHead>{t('create.rulesMin', { defaultValue: 'Minimum amount' })}</TableHead>
                  <TableHead>{t('create.rulesMax', { defaultValue: 'Maximum amount' })}</TableHead>
                  <TableHead>{t('create.rulesCutOff', { defaultValue: 'Cut-off time' })}</TableHead>
                  <TableHead>{t('create.rulesSettlement', { defaultValue: 'Settlement' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instruments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/portal/instruments/${i.id}`}
                        className="font-medium hover:underline"
                      >
                        {isFa ? i.nameFa : i.nameEn}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" appearance="light">
                        {i.symbol}
                      </Badge>
                    </TableCell>
                    {/* navIssue, not navPerUnit: this column is headed «NAV صدور»
                        and until Instrument carried an issue NAV it was filled
                        with the single unit value, so label and figure disagreed. */}
                    <TableCell>{formatAmount(i.navIssue)}</TableCell>
                    <TableCell>{formatAmount(i.rule.minAmount)}</TableCell>
                    <TableCell>{formatAmount(i.rule.maxAmount)}</TableCell>
                    <TableCell>{i.rule.cutOffTime}</TableCell>
                    <TableCell>
                      {t('create.rulesSettlementValue', {
                        days: i.rule.settlementDays,
                        defaultValue: `T+${i.rule.settlementDays}`,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('portal.funds.units', { defaultValue: 'Units' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {instruments === null
              ? null
              : instruments
                  .map(
                    (i) =>
                      `${isFa ? i.nameFa : i.nameEn} — ${formatUnits(i.rule.minUnits)}`,
                  )
                  .join('  ·  ')}
          </p>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
