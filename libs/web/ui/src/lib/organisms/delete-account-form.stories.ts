import type { Meta, StoryObj } from '@storybook/angular';
import { DeleteAccountForm } from './delete-account-form';

const meta: Meta<DeleteAccountForm> = {
  title: 'Organisms/Delete account form',
  component: DeleteAccountForm,
};
export default meta;

type Story = StoryObj<DeleteAccountForm>;

export const Empty: Story = {};
export const Pending: Story = { args: { pending: true } };
export const WrongPassword: Story = {
  args: { error: 'The password is not correct' },
};
