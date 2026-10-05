import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { AppHeader } from '../organisms/app-header';
import { LoginForm } from '../organisms/login-form';
import { NotFound } from '../organisms/not-found';
import { UserList } from '../organisms/user-list';
import { UserSummary } from '../organisms/user-summary';
import { CenteredCard } from './centered-card';
import { PageLayout } from './page-layout';
import { Stack } from './stack';

/**
 * Templates with real organisms in them: what a page looks like before a
 * page component connects it to state.
 */
const meta: Meta<PageLayout> = {
  title: 'Templates/Page layout',
  component: PageLayout,
  decorators: [
    moduleMetadata({
      imports: [
        AppHeader,
        CenteredCard,
        LoginForm,
        NotFound,
        Stack,
        UserList,
        UserSummary,
      ],
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
    props: {
      users: {
        status: 'resolved',
        value: [{ id: '1', email: 'admin@example.com' }],
      },
    },
    template: `
      <app-page-layout>
        <app-header layoutHeader title="Boilerplate" />
        <app-stack>
          <app-user-summary email="admin@example.com" [permissions]="['users:read']" />
          <app-user-list [users]="users" />
        </app-stack>
      </app-page-layout>
    `,
  }),
};

export const NotFoundPage: Story = {
  render: () => ({
    template: `
      <app-page-layout>
        <app-header layoutHeader title="Boilerplate" />
        <app-centered-card><app-not-found /></app-centered-card>
      </app-page-layout>
    `,
  }),
};
