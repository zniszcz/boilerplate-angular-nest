import type { Meta, StoryObj } from '@storybook/angular';
import { UserList } from './user-list';

const users = [
  { id: '1', email: 'admin@example.com', firstLoginAt: '2026-10-01T08:00:00Z' },
  { id: '2', email: 'anna@example.com', firstLoginAt: '2026-10-05T12:30:00Z' },
  { id: '3', email: 'piotr@example.com', firstLoginAt: null },
];

/** Every organism with data has Loading, Ready and Error stories. */
const meta: Meta<UserList> = {
  title: 'Organisms/User list',
  component: UserList,
};
export default meta;

type Story = StoryObj<UserList>;

export const Loading: Story = {
  args: { users: { status: 'loading', value: undefined } },
};
export const Ready: Story = {
  args: { users: { status: 'resolved', value: users } },
};
export const Empty: Story = {
  args: { users: { status: 'resolved', value: [] } },
};
/** A reload keeps the list on screen. */
export const Reloading: Story = {
  args: { users: { status: 'reloading', value: users } },
};
export const Error: Story = {
  args: { users: { status: 'error', error: new globalThis.Error('500') } },
};
