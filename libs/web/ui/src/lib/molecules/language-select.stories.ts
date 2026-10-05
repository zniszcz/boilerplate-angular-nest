import type { Meta, StoryObj } from '@storybook/angular';
import { LanguageSelect } from './language-select';

const meta: Meta<LanguageSelect> = {
  title: 'Molecules/Language select',
  component: LanguageSelect,
  args: { languages: ['en', 'pl'], active: 'en', label: 'Language' },
};
export default meta;

export const Default: StoryObj<LanguageSelect> = {};
