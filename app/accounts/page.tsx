'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { AccountsContent } from './content';

export default function AccountsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AccountsContent />
      </Container>
    </Fragment>
  );
}
