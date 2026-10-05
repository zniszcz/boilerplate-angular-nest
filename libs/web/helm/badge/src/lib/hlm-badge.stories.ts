import type { Meta, StoryObj } from '@storybook/angular';
import { HlmBadge } from './hlm-badge';

const meta: Meta<HlmBadge> = {
  title: 'Atoms/Badge',
  component: HlmBadge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
  args: { variant: 'secondary' },
  render: (args) => ({
    props: args,
    template: `<span hlmBadge [variant]="variant">users:read</span>`,
  }),
};
export default meta;

export const Secondary: StoryObj<HlmBadge> = {};
export const Default: StoryObj<HlmBadge> = { args: { variant: 'default' } };
