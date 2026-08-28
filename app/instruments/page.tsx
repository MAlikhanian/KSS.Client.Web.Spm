'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { InstrumentsContent } from './content';

export default function InstrumentsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <InstrumentsContent />
      </Container>
    </Fragment>
  );
}
