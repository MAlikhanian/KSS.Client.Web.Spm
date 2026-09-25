'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { RequestCreateContent } from './content';

export default function RequestCreatePage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <RequestCreateContent />
      </Container>
    </Fragment>
  );
}
