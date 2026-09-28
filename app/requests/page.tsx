'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { RequestsContent } from './content';

export default function RequestsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <RequestsContent />
      </Container>
    </Fragment>
  );
}
