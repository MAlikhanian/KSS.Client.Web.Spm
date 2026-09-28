'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';

/**
 * SPM — the page shell every screen in this section uses.
 *
 * Encodes the platform page layout rule once, so the 13 SPM screens cannot
 * drift from it:
 *   1. a full-width title Card on top, with the Toolbar INSIDE the Card
 *   2. below it, the content wrapped in the blue glass-tint descendant selector
 *
 * The title Card sits OUTSIDE the tint wrapper on purpose — a descendant
 * selector beats a Card-level class on specificity even with `!`, so a title
 * Card placed inside would lose its own colour. Same arrangement as
 * app/(protected)/brokerages/general-information/content.tsx.
 */

/** Blue: the hue for the SPM page family. */
const GLASS_WRAPPER =
  '[&_div.rounded-xl.bg-card]:bg-blue-50/25! ' +
  '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
  'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
  'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
  '[&_div.rounded-xl.bg-card]:shadow-lg ' +
  '[&_div.rounded-xl.bg-card]:shadow-black/5';

const TITLE_CARD =
  'bg-blue-50/25! border-blue-100! dark:bg-blue-950/25! dark:border-blue-900! shadow-lg shadow-black/5';

interface SectionShellProps {
  /** Page title. Omit to let ToolbarPageTitle derive it from the route. */
  title?: string;
  description: string;
  /** Buttons rendered on the right of the toolbar. */
  actions?: ReactNode;
  children: ReactNode;
}

export function SectionShell({ title, description, actions, children }: SectionShellProps) {
  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className={TITLE_CARD}>
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              {title ? <ToolbarPageTitle text={title} /> : <ToolbarPageTitle />}
              <ToolbarDescription>{description}</ToolbarDescription>
            </ToolbarHeading>
            {actions ? <ToolbarActions>{actions}</ToolbarActions> : null}
          </Toolbar>
        </CardContent>
      </Card>

      <div className={GLASS_WRAPPER}>
        <div className="grid gap-5 lg:gap-7.5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Variant for screens that carry a right-hand sidebar (cardex): a 4-column grid
 * with 3 columns of content and 1 of sidebar, per the platform layout rule.
 */
export function SectionShellWithSidebar({
  title,
  description,
  actions,
  sidebar,
  children,
}: SectionShellProps & { sidebar: ReactNode }) {
  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className={TITLE_CARD}>
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              {title ? <ToolbarPageTitle text={title} /> : <ToolbarPageTitle />}
              <ToolbarDescription>{description}</ToolbarDescription>
            </ToolbarHeading>
            {actions ? <ToolbarActions>{actions}</ToolbarActions> : null}
          </Toolbar>
        </CardContent>
      </Card>

      <div className={GLASS_WRAPPER}>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
          <div className="col-span-1 xl:col-span-3 grid gap-5 lg:gap-7.5">{children}</div>
          <div className="col-span-1">{sidebar}</div>
        </div>
      </div>
    </div>
  );
}

export { GLASS_WRAPPER, TITLE_CARD };
