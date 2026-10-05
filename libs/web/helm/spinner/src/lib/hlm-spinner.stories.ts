import type { Meta, StoryObj } from '@storybook/angular';
import { HlmSpinner } from './hlm-spinner';

/** For an action in progress, such as a button. Data loading uses skeletons. */
const meta: Meta<HlmSpinner> = {
  title: 'Atoms/Spinner',
  component: HlmSpinner,
  render: () => ({ template: `<hlm-spinner />` }),
};
export default meta;

export const Default: StoryObj<HlmSpinner> = {};
