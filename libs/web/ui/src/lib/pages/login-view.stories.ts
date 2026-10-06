import type { Meta, StoryObj } from '@storybook/angular';
import { LoginView } from './login-view';
import { pageFrame } from './page-frame';

const meta: Meta<LoginView> = {
  title: 'Pages/Login',
  component: LoginView,
  decorators: pageFrame(null),
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<LoginView>;

export const Default: Story = {};
export const Failed: Story = { args: { error: 'Invalid email or password' } };
