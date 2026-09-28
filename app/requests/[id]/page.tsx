'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { RequestDetailContent } from './content';

export default function RequestDetailPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <RequestDetailContent />
      </Container>
    </Fragment>
  );
}
