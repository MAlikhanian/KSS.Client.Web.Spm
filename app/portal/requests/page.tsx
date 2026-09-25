'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PortalRequestsContent } from './content';

/** No <PageNavbar /> — see app/portal/page.tsx for why. */
export default function PortalRequestsPage() {
  return (
    <Fragment>
      <Container>
        <PortalRequestsContent />
      </Container>
    </Fragment>
  );
}
