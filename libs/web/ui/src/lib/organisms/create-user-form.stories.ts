import type { Meta, StoryObj } from '@storybook/angular';
import { CreateUserForm } from './create-user-form';

const meta: Meta<CreateUserForm> = {
  title: 'Organisms/Create user form',
  component: CreateUserForm,
};
export default meta;

type Story = StoryObj<CreateUserForm>;

export const Empty: Story = {};
export const Pending: Story = { args: { pending: true } };
/** The password is shown once, right after the account is created. */
export const Created: Story = {
  args: {
    created: {
      email: 'anna@example.com',
      password: 'vS3k9QdP0xLr2mTb7YcWnA1e',
    },
  },
};
export const Error: Story = {
  args: { error: 'An account with this email already exists' },
};
