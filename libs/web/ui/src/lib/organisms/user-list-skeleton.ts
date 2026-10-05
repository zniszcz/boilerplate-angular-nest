import { Component, input } from '@angular/core';
import { HlmSkeleton } from '@boilerplate/web-helm/skeleton';

/**
 * The loading look of UserList: same card, same row height, so nothing
 * moves when the data comes (no layout shift). Small and separate, so a
 * `@defer` placeholder can show it before UserList itself is loaded.
 */
@Component({
  selector: 'app-user-list-skeleton',
  imports: [HlmSkeleton],
  template: `
    <section class="bg-card grid gap-3 rounded-xl border p-4 sm:p-6">
      <hlm-skeleton class="h-5 w-24" />
      @for (row of rows(); track $index) {
        <hlm-skeleton class="h-11 w-full" />
      }
    </section>
  `,
})
export class UserListSkeleton {
  /** How many rows to suggest. */
  readonly count = input(3);
  protected readonly rows = () => Array.from({ length: this.count() });
}
