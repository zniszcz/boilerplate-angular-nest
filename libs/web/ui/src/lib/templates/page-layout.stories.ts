import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { AppHeader } from '../organisms/app-header';
import { LoginForm } from '../organisms/login-form';
import { UserSummary } from '../organisms/user-summary';
import { CenteredCard } from './centered-card';
import { PageLayout } from './page-layout';

/**
 * Templates with real organisms in them: what a page looks like before a
 * page component connects it to state.
 */
const meta: Meta<PageLayout> = {
  title: 'Templates/Page layout',
  component: PageLayout,
  decorators: [
    moduleMetadata({
      imports: [AppHeader, CenteredCard, LoginForm, UserSummary],
    }),
  ],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<PageLayout>;

export const LoginPage: Story = {
  render: () => ({
    template: `
      <app-page-layout>
        <app-header layoutHeader title="Boilerplate" />
        <app-centered-card><app-login-form /></app-centered-card>
      </app-page-layout>
    `,
  }),
};

export const HomePage: Story = {
  render: () => ({
    template: `
      <app-page-layout>
        <app-header layoutHeader title="Boilerplate" />
        <app-user-summary email="admin@example.com" [permissions]="['users:read']" />
      </app-page-layout>
    `,
  }),
};
