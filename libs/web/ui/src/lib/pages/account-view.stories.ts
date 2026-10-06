import type { Meta, StoryObj } from '@storybook/angular';
import { AccountView } from './account-view';
import { pageFrame } from './page-frame';

const meta: Meta<AccountView> = {
  title: 'Pages/Account',
  component: AccountView,
  decorators: pageFrame('/account'),
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AccountView>;

export const Default: Story = {};
export const WrongPassword: Story = {
  args: { deleteError: 'The password is not correct' },
};
export const LastAdmin: Story = {
  args: {
    deleteError:
      'This is the last account that can add users, so it cannot be deleted',
  },
};
