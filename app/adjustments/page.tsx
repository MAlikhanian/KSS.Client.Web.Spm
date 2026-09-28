'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { AdjustmentsContent } from './content';

export default function AdjustmentsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AdjustmentsContent />
      </Container>
    </Fragment>
  );
}
