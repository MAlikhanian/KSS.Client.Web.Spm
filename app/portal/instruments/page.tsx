'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PortalInstrumentsContent } from './content';

/** No <PageNavbar /> — see app/portal/page.tsx for why. */
export default function PortalInstrumentsPage() {
  return (
    <Fragment>
      <Container>
        <PortalInstrumentsContent />
      </Container>
    </Fragment>
  );
}
