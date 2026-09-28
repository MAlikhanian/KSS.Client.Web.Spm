'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { AuditContent } from './content';

export default function AuditPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AuditContent />
      </Container>
    </Fragment>
  );
}
