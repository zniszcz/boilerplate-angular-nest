import { Component, input } from '@angular/core';

/**
 * The app name, navigation under it (`[headerNav]`) and whatever else is
 * projected on the right.
 */
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
      <div class="mx-auto w-full max-w-screen-md px-2 pb-2 sm:px-4">
        <ng-content select="[headerNav]" />
      </div>
    </header>
  `,
})
export class AppHeader {
  readonly title = input.required<string>();
}
