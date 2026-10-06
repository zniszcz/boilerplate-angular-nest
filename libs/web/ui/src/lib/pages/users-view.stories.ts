import type { Meta, StoryObj } from '@storybook/angular';
import { pageFrame } from './page-frame';
import { UsersView } from './users-view';

const users = [
  { id: '1', email: 'admin@example.com', firstLoginAt: '2026-10-01T08:00:00Z' },
  { id: '2', email: 'anna@example.com', firstLoginAt: null },
];

const meta: Meta<UsersView> = {
  title: 'Pages/Users',
  component: UsersView,
  decorators: pageFrame('/users'),
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<UsersView>;

export const Admin: Story = {
  args: { canCreate: true, users: { status: 'resolved', value: users } },
};
/** Right after adding a user: the password, shown once. */
export const UserCreated: Story = {
  args: {
    canCreate: true,
    users: { status: 'resolved', value: users },
    created: {
      email: 'anna@example.com',
      password: 'vS3k9QdP0xLr2mTb7YcWnA1e',
    },
  },
};
export const Loading: Story = {
  args: { canCreate: true, users: { status: 'loading', value: undefined } },
};
/** Not an admin, but with users:read: the list without the form. */
export const NotAdmin: Story = {
  args: { users: { status: 'resolved', value: users } },
};
