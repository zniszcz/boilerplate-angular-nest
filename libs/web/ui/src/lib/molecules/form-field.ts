import { Component, input } from '@angular/core';
import { HlmLabel } from '@boilerplate/web-helm/label';

/** A label, the projected control and an optional error under it. */
@Component({
  selector: 'app-form-field',
  imports: [HlmLabel],
  template: `
    <label class="grid gap-2">
      <span hlmLabel>{{ label() }}</span>
      <ng-content />
      @if (error(); as error) {
        <span class="text-destructive text-sm">{{ error }}</span>
      }
    </label>
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
}
