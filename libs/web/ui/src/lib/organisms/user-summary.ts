import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@boilerplate/web-helm/badge';
import { HlmButton } from '@boilerplate/web-helm/button';

/** Who is logged in, with what permissions, and a logout button. */
@Component({
  selector: 'app-user-summary',
  imports: [TranslocoPipe, HlmBadge, HlmButton],
  template: `
    <section class="bg-card grid gap-4 rounded-xl border p-4 sm:p-6">
      <p class="text-lg">
        {{ 'home.greeting' | transloco: { email: email() } }}
      </p>

      <div class="grid gap-2">
        <h2
          class="text-muted-foreground text-sm font-medium tracking-wide uppercase"
        >
          {{ 'home.permissions' | transloco }}
        </h2>
        <ul class="flex flex-wrap gap-2">
          @for (permission of permissions(); track permission) {
            <li hlmBadge variant="secondary">{{ permission }}</li>
          }
        </ul>
      </div>

      <button
        hlmBtn
        variant="outline"
        class="w-full sm:w-auto sm:justify-self-start"
        (click)="logout.emit()"
      >
        {{ 'auth.logout' | transloco }}
      </button>
    </section>
  `,
})
export class UserSummary {
  readonly email = input.required<string>();
  readonly permissions = input.required<readonly string[]>();
  readonly logout = output();
}
