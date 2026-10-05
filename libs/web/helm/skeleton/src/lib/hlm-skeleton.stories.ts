import type { Meta, StoryObj } from '@storybook/angular';
import { HlmSkeleton } from './hlm-skeleton';

/** Shows right away, because it holds the layout of the coming content. */
const meta: Meta<HlmSkeleton> = {
  title: 'Atoms/Skeleton',
  component: HlmSkeleton,
  render: () => ({
    template: `
      <div class="grid gap-3">
        <hlm-skeleton class="h-5 w-24" />
        <hlm-skeleton class="h-11 w-full" />
        <hlm-skeleton class="h-11 w-full" />
      </div>
    `,
  }),
};
export default meta;

export const Default: StoryObj<HlmSkeleton> = {};
