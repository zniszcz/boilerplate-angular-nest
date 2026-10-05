import type { Meta, StoryObj } from '@storybook/angular';
import { HlmInput } from './hlm-input';

const meta: Meta<HlmInput> = {
  title: 'Atoms/Input',
  component: HlmInput,
  render: () => ({
    template: `<input hlmInput type="email" placeholder="name@example.com" />`,
  }),
};
export default meta;

export const Default: StoryObj<HlmInput> = {};

export const Disabled: StoryObj<HlmInput> = {
  render: () => ({
    template: `<input hlmInput value="Read only" disabled />`,
  }),
};
