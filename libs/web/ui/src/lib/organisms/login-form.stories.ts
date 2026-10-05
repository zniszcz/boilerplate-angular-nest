import type { Meta, StoryObj } from '@storybook/angular';
import { LoginForm } from './login-form';

const meta: Meta<LoginForm> = {
  title: 'Organisms/Login form',
  component: LoginForm,
  args: { pending: false, error: null },
};
export default meta;

type Story = StoryObj<LoginForm>;

export const Default: Story = {};
export const Pending: Story = { args: { pending: true } };
export const WithError: Story = {
  args: { error: 'Invalid email or password' },
};
