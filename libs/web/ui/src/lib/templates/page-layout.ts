import { Component } from '@angular/core';

/** Header on top, page content below it in a readable column. */
@Component({
  selector: 'app-page-layout',
  template: `
    <div class="flex min-h-dvh flex-col">
      <ng-content select="[layoutHeader]" />
      <main class="mx-auto w-full max-w-screen-md flex-1 p-4 sm:p-6">
        <ng-content />
      </main>
    </div>
  `,
})
export class PageLayout {}
