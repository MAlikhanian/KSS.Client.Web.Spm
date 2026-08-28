'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslatedMenu } from '@/lib/use-translated-menu';
import { navItemsForPathPrefix } from '@/lib/menu-nav-utils';

/**
 * Sub-navigation across the SPM screens. Items are derived from the SPM group
 * in config/menu.config.tsx, so adding a screen to the menu adds it here too.
 */
const PageNavbar = () => {
  const { settings } = useSettings();
  const { menuSidebar } = useTranslatedMenu();
  const spmMenuConfig = navItemsForPathPrefix(menuSidebar, '/spm/');

  if (spmMenuConfig && settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <NavbarMenu items={spmMenuConfig} />
        </Container>
      </Navbar>
    );
  } else {
    return <></>;
  }
};

export { PageNavbar };
