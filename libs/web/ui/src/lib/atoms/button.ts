import { Component, computed, input } from '@angular/core';

const VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
} as const;

/** Full width on phones, natural width from `sm` up. */
@Component({
  selector: 'app-button',
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="classes()">
      <ng-content />
    </button>
  `,
  host: { class: 'block sm:inline-block' },
})
export class Button {
  readonly type = input<'button' | 'submit'>('button');
  readonly variant = input<keyof typeof VARIANTS>('primary');
  readonly disabled = input(false);

  protected readonly classes = computed(
    () =>
      `w-full rounded-lg px-4 py-3 text-base font-medium transition sm:w-auto sm:py-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[this.variant()]}`,
  );
}
