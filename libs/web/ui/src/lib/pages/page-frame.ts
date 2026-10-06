import { componentWrapperDecorator, moduleMetadata } from '@storybook/angular';
import { MainNav } from '../organisms/main-nav';
import { AppHeader } from '../organisms/app-header';
import { PageLayout } from '../templates/page-layout';

const NAV = [
  { path: '/', label: 'nav.home' },
  { path: '/users', label: 'nav.users' },
  { path: '/account', label: 'nav.account' },
];

/**
 * For page stories only: puts the page in the app's layout, header and
 * navigation, as the app shell does, so a story shows the whole screen.
 */
export function pageFrame(active: string | null) {
  return [
    moduleMetadata({ imports: [PageLayout, AppHeader, MainNav] }),
    componentWrapperDecorator(
      (story) => `
        <app-page-layout>
          <app-header layoutHeader title="Boilerplate">
            ${
              active === null
                ? ''
                : `<app-main-nav headerNav [items]="nav" active="${active}" />`
            }
          </app-header>
          ${story}
        </app-page-layout>
      `,
      { nav: NAV },
    ),
  ];
}
