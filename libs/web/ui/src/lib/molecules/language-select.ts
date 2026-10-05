import { Component, input, output } from '@angular/core';

/** A native select: the phone shows its own picker. */
@Component({
  selector: 'app-language-select',
  template: `
    <label class="text-muted-foreground flex items-center gap-2 text-sm">
      <span class="sr-only sm:not-sr-only">{{ label() }}</span>
      <select
        #select
        class="border-input bg-background h-11 rounded-md border px-2 text-base md:h-9 md:text-sm"
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
