import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { HlmInput } from '@boilerplate/web-helm/input';
import { FormField } from './form-field';

const meta: Meta<FormField> = {
  title: 'Molecules/Form field',
  component: FormField,
  decorators: [moduleMetadata({ imports: [HlmInput] })],
  args: { label: 'Email', error: null },
  render: (args) => ({
    props: args,
    template: `
      <app-form-field [label]="label" [error]="error">
        <input hlmInput type="email" />
      </app-form-field>
    `,
  }),
};
export default meta;

type Story = StoryObj<FormField>;

export const Default: Story = {};
export const WithError: Story = {
  args: { error: 'Enter a valid email address' },
};
