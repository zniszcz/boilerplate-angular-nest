import type { Meta, StoryObj } from '@storybook/angular';
import { HlmLabel } from './hlm-label';

const meta: Meta<HlmLabel> = {
  title: 'Atoms/Label',
  component: HlmLabel,
  render: () => ({ template: `<span hlmLabel>Email</span>` }),
};
export default meta;

export const Default: StoryObj<HlmLabel> = {};
