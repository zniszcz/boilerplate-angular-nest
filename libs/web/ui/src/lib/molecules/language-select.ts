import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-language-select',
  template: `
    <label class="flex items-center gap-2 text-sm text-slate-600">
      <span class="sr-only sm:not-sr-only">{{ label() }}</span>
      <select
        #select
        class="rounded-lg border border-slate-300 bg-white px-2 py-2 text-base sm:py-1 sm:text-sm"
        [attr.aria-label]="label()"
        (change)="changed.emit(select.value)"
      >
        @for (language of languages(); track language) {
          <option [value]="language" [selected]="language === active()">
            {{ language.toUpperCase() }}
          </option>
        }
      </select>
    </label>
  `,
})
export class LanguageSelect {
  readonly languages = input.required<readonly string[]>();
  readonly active = input<string>();
  readonly label = input.required<string>();
  readonly changed = output<string>();
}
