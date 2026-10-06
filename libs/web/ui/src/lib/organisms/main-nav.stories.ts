import type { Meta, StoryObj } from '@storybook/angular';
import { MainNav } from './main-nav';

const items = [
  { path: '/', label: 'nav.home' },
  { path: '/users', label: 'nav.users' },
  { path: '/account', label: 'nav.account' },
];

const meta: Meta<MainNav> = {
  title: 'Organisms/Main nav',
  component: MainNav,
};
export default meta;

type Story = StoryObj<MainNav>;

export const OnHome: Story = { args: { items, active: '/' } };
export const OnUsers: Story = { args: { items, active: '/users' } };
/** Not an admin, without users:read: the users page is not linked. */
export const NotAdmin: Story = {
  args: { items: items.filter((i) => i.path !== '/users'), active: '/' },
};
