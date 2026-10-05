import { Component, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { HlmButton } from '@boilerplate/web-helm/button';

/**
 * The motion catalog from apps/web/src/styles.css. Press the button to see
 * the pattern enter and leave. With "reduce motion" on in the system, nothing
 * moves.
 */
@Component({
  selector: 'app-motion-demo',
  imports: [HlmButton],
  template: `
    <div class="grid gap-4">
      <button hlmBtn variant="outline" (click)="shown.set(!shown())">
        Toggle
      </button>
      @if (shown()) {
        <div
          [animate.enter]="enter()"
          animate.leave="motion-disappear"
          class="bg-card rounded-xl border p-4"
        >
          {{ enter() }}
        </div>
      }
    </div>
  `,
})
class MotionDemo {
  readonly enter = input.required<string>();
  protected readonly shown = signal(true);
}

const meta: Meta<MotionDemo> = {
  title: 'Foundations/Motion',
  component: MotionDemo,
};
export default meta;

type Story = StoryObj<MotionDemo>;

/** Something new shows up: a list row, a message, a section. */
export const Appear: Story = { args: { enter: 'motion-appear' } };
/** A skeleton gives way to content. */
export const Swap: Story = { args: { enter: 'motion-swap' } };
/** An error or a notice slides in, never shakes. */
export const Alert: Story = { args: { enter: 'motion-alert' } };
