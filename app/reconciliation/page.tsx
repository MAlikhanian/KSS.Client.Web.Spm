'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { ReconciliationContent } from './content';

export default function ReconciliationPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <ReconciliationContent />
      </Container>
    </Fragment>
  );
}
