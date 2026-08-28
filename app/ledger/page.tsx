'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { LedgerContent } from './content';

export default function LedgerPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <LedgerContent />
      </Container>
    </Fragment>
  );
}
