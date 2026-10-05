import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { LanguageSelect } from '../molecules/language-select';
import { AppHeader } from './app-header';

const meta: Meta<AppHeader> = {
  title: 'Organisms/App header',
  component: AppHeader,
  decorators: [moduleMetadata({ imports: [LanguageSelect] })],
  parameters: { layout: 'fullscreen' },
  args: { title: 'Boilerplate' },
  render: (args) => ({
    props: args,
    template: `
      <app-header [title]="title">
        <app-language-select [languages]="['en', 'pl']" active="en" label="Language" />
      </app-header>
    `,
  }),
};
export default meta;

export const Default: StoryObj<AppHeader> = {};
