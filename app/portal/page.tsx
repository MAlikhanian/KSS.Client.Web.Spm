'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PortalContent } from './content';

/**
 * No <PageNavbar /> here on purpose.
 *
 * PageNavbar renders the OPERATOR console's tab set — `navItemsForPathPrefix`
 * returns the first menu group containing a `/spm/` path, which is
 * "SPM Investment". The portal is a different audience and carries its own
 * navigation inside PortalShell, so showing the operator tabs above it would be
 * wrong rather than merely redundant.
 */
export default function PortalPage() {
  return (
    <Fragment>
      <Container>
        <PortalContent />
      </Container>
    </Fragment>
  );
}
