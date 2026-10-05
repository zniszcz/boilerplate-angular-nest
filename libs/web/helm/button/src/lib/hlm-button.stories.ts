import type { Meta, StoryObj } from '@storybook/angular';
import { HlmButton } from './hlm-button';

const meta: Meta<HlmButton> = {
  title: 'Atoms/Button',
  component: HlmButton,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'outline',
        'secondary',
        'ghost',
        'destructive',
        'link',
      ],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg'] },
  },
  args: { variant: 'default', size: 'default' },
  render: (args) => ({
    props: args,
    template: `<button hlmBtn [variant]="variant" [size]="size">Save</button>`,
  }),
};
export default meta;

type Story = StoryObj<HlmButton>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: 'outline' } };
export const Destructive: Story = { args: { variant: 'destructive' } };

/** Full width on phones, natural width from `sm` up, as in forms. */
export const FullWidthOnPhones: Story = {
  render: () => ({
    template: `<button hlmBtn class="w-full sm:w-auto">Log in</button>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    template: `<button hlmBtn disabled>Save</button>`,
  }),
};
