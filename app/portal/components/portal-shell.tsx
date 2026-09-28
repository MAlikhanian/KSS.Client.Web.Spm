'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

/**
 * SPM investor portal — the shell for the END-USER side (proposal §6-1).
 *
 * Deliberately a different hue from the operator console: the console is blue
 * (see `app/components/section-shell.tsx`), the portal is emerald. Two audiences,
 * two chromes, one codebase — an operator glancing at a screenshot can tell
 * instantly which side of the platform it came from.
 *
 * The layout rule itself is identical to the console's and to the rest of the
 * platform: a full-width title Card on top with the Toolbar inside it, then the
 * content wrapped in the glass-tint descendant selector. The title Card sits
 * OUTSIDE the tint wrapper on purpose — a descendant selector beats a
 * Card-level class on specificity even with `!`.
 */

/** Emerald: the hue for the investor-facing family. */
const GLASS_WRAPPER =
  '[&_div.rounded-xl.bg-card]:bg-emerald-50/25! ' +
  '[&_div.rounded-xl.bg-card]:border-emerald-100! ' +
  'dark:[&_div.rounded-xl.bg-card]:bg-emerald-950/25! ' +
  'dark:[&_div.rounded-xl.bg-card]:border-emerald-900! ' +
  '[&_div.rounded-xl.bg-card]:shadow-lg ' +
  '[&_div.rounded-xl.bg-card]:shadow-black/5';

const TITLE_CARD =
  'bg-emerald-50/25! border-emerald-100! dark:bg-emerald-950/25! dark:border-emerald-900! shadow-lg shadow-black/5';

interface PortalNavItem {
  href: string;
  key: string;
  fallback: string;
}

const NAV: PortalNavItem[] = [
  { href: '/portal', key: 'portal.nav.overview', fallback: 'Overview' },
  { href: '/portal/instruments', key: 'portal.nav.instruments', fallback: 'Instruments' },
  { href: '/portal/new-request', key: 'portal.nav.newRequest', fallback: 'New request' },
  { href: '/portal/requests', key: 'portal.nav.myRequests', fallback: 'My requests' },
];

export function PortalNav() {
  const { t } = useTranslation('spm-requests');
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {NAV.map((item) => {
        const active =
          item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(item.key, { defaultValue: item.fallback })}
          </Link>
        );
      })}
    </nav>
  );
}

interface PortalShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PortalShell({ title, description, actions, children }: PortalShellProps) {
  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className={TITLE_CARD}>
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={title} />
              <ToolbarDescription>{description}</ToolbarDescription>
            </ToolbarHeading>
            {actions ? <ToolbarActions>{actions}</ToolbarActions> : null}
          </Toolbar>
        </CardContent>
      </Card>

      <div className="px-1">
        <PortalNav />
      </div>

      <div className={GLASS_WRAPPER}>
        <div className="grid gap-5 lg:gap-7.5">{children}</div>
      </div>
    </div>
  );
}

export { GLASS_WRAPPER as PORTAL_GLASS_WRAPPER, TITLE_CARD as PORTAL_TITLE_CARD };
