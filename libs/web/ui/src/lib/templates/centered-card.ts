import { Component } from '@angular/core';

/** Full width on phones, a centered card from `sm` up. */
@Component({
  selector: 'app-centered-card',
  template: `
    <div class="flex justify-center sm:pt-12">
      <section
        class="w-full sm:max-w-sm sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:p-6 sm:shadow-sm"
      >
        <ng-content />
      </section>
    </div>
  `,
})
export class CenteredCard {}
