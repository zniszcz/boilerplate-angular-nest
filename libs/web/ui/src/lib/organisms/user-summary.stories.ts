import type { Meta, StoryObj } from '@storybook/angular';
import { UserSummary } from './user-summary';

const meta: Meta<UserSummary> = {
  title: 'Organisms/User summary',
  component: UserSummary,
  args: { email: 'admin@example.com', permissions: ['users:read'] },
};
export default meta;

type Story = StoryObj<UserSummary>;

export const Default: Story = {};
export const ManyPermissions: Story = {
  args: {
    permissions: ['users:read', 'users:write', 'orders:read', 'reports:read'],
  },
};
