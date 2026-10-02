import { Component, input } from '@angular/core';

/** A label, the projected input and an optional error under it. */
@Component({
  selector: 'app-form-field',
  template: `
    <label class="grid gap-1">
      <span class="text-sm font-medium text-slate-700">{{ label() }}</span>
      <ng-content />
      @if (error(); as error) {
        <span class="text-sm text-red-700">{{ error }}</span>
      }
    </label>
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
}
