import { Component, input } from '@angular/core';

/** The app name, and whatever is projected on the right. */
@Component({
  selector: 'app-header',
  template: `
    <header class="bg-card border-b">
      <div
        class="mx-auto flex w-full max-w-screen-md items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <span class="font-semibold">{{ title() }}</span>
        <ng-content />
      </div>
    </header>
  `,
})
export class AppHeader {
  readonly title = input.required<string>();
}
