'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { HealthContent } from './content';

export default function HealthPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <HealthContent />
      </Container>
    </Fragment>
  );
}
