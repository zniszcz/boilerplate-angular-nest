import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../atoms/button';

@Component({
  selector: 'app-user-summary',
  imports: [TranslocoPipe, Button],
  template: `
    <section
      class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
    >
      <p class="text-lg">
        {{ 'home.greeting' | transloco: { email: email() } }}
      </p>

      <div class="grid gap-2">
        <h2 class="text-sm font-medium uppercase tracking-wide text-slate-500">
          {{ 'home.permissions' | transloco }}
        </h2>
        <ul class="flex flex-wrap gap-2">
          @for (permission of permissions(); track permission) {
            <li class="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {{ permission }}
            </li>
          }
        </ul>
      </div>

      <app-button variant="secondary" (click)="logout.emit()">
        {{ 'auth.logout' | transloco }}
      </app-button>
    </section>
  `,
})
export class UserSummary {
  readonly email = input.required<string>();
  readonly permissions = input.required<readonly string[]>();
  readonly logout = output();
}
