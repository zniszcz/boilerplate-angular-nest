import type { Meta, StoryObj } from '@storybook/angular';
import { NotFoundView } from './not-found-view';
import { pageFrame } from './page-frame';

const meta: Meta<NotFoundView> = {
  title: 'Pages/Not found',
  component: NotFoundView,
  decorators: pageFrame(null),
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj<NotFoundView> = {};
