import type { Meta, StoryObj } from '@storybook/angular';
import { HomeView } from './home-view';
import { pageFrame } from './page-frame';

/** Whole screens: a page view in the app's layout, with plain data. */
const meta: Meta<HomeView> = {
  title: 'Pages/Home',
  component: HomeView,
  decorators: pageFrame('/'),
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<HomeView>;

export const Admin: Story = {
  args: {
    email: 'admin@example.com',
    permissions: ['users:read', 'users:create'],
  },
};
export const WithoutPermissions: Story = {
  args: { email: 'anna@example.com', permissions: [] },
};
