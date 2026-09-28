'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { SettlementsContent } from './content';

export default function SettlementsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <SettlementsContent />
      </Container>
    </Fragment>
  );
}
