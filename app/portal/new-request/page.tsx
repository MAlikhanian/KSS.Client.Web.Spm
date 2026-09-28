'use client';

import { Fragment, Suspense } from 'react';
import { Container } from '@/components/common/container';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalNewRequestContent } from './content';

/** No <PageNavbar /> — see app/portal/page.tsx for why. */
/**
 * `content.tsx` reads the deep link from a fund page with `useSearchParams()`.
 *
 * The usual rule is that this breaks `next build` unless the caller sits inside
 * a <Suspense> boundary. MEASURED, IT DOES NOT BREAK THIS APP — a build with
 * the boundary removed compiles clean. The bailout only fires on a STATICALLY
 * PRERENDERED route, and nothing here is prerendered: `app/layout.tsx:50`
 * awaits `headers()`, a dynamic API in the ROOT layout, which opts every route
 * in the app out of static generation. The build's own route table confirms it
 * — all 21 routes are marked `ƒ (Dynamic) server-rendered on demand`, none `○`.
 *
 * The boundary is kept anyway, as insurance rather than as a fix: it costs one
 * wrapper, and the day someone removes that `headers()` call the whole app
 * becomes prerenderable and this page would be the one that fails the build.
 * Do not delete it on the grounds that the build passes without it — that is
 * true today and true only because of a line in a file nobody edits.
 */
export default function PortalNewRequestPage() {
  return (
    <Fragment>
      <Container>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <PortalNewRequestContent />
        </Suspense>
      </Container>
    </Fragment>
  );
}
