import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { AppHeader } from '../organisms/app-header';
import { MainNav } from '../organisms/main-nav';
import { PageLayout } from './page-layout';

/** The frame of every page. Whole pages are under Pages. */
const meta: Meta<PageLayout> = {
  title: 'Templates/Page layout',
  component: PageLayout,
  decorators: [moduleMetadata({ imports: [AppHeader, MainNav] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj<PageLayout> = {
  render: () => ({
    props: {
      nav: [
        { path: '/', label: 'nav.home' },
        { path: '/users', label: 'nav.users' },
      ],
    },
    template: `
      <app-page-layout>
        <app-header layoutHeader title="Boilerplate">
          <app-main-nav headerNav [items]="nav" active="/" />
        </app-header>
        <p class="text-muted-foreground">Page content</p>
      </app-page-layout>
    `,
  }),
};
