'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PortalFundDetailContent } from './content';

/** No <PageNavbar /> — see app/portal/page.tsx for why. */
export default function PortalFundDetailPage() {
  return (
    <Fragment>
      <Container>
        <PortalFundDetailContent />
      </Container>
    </Fragment>
  );
}
