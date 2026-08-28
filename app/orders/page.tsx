'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { OrdersContent } from './content';

export default function OrdersPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <OrdersContent />
      </Container>
    </Fragment>
  );
}
