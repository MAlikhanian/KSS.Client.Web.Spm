'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { ResolutionContent } from './content';

export default function ResolutionPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <ResolutionContent />
      </Container>
    </Fragment>
  );
}
