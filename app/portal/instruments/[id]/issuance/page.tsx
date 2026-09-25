'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PortalIssuanceContent } from './content';

/** No <PageNavbar /> — see app/portal/page.tsx for why. */
/**
 * No <Suspense> here, unlike the sibling new-request page: the fund is read
 * from the ROUTE with useParams(), not from the query string, so nothing on
 * this page calls useSearchParams().
 */
export default function PortalIssuancePage() {
  return (
    <Fragment>
      <Container>
        <PortalIssuanceContent />
      </Container>
    </Fragment>
  );
}
