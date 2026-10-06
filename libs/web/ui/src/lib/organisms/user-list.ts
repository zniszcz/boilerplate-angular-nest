import { Component, input, output, type ResourceSnapshot } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@boilerplate/web-helm/badge';
import { HlmButton } from '@boilerplate/web-helm/button';
import { UserListSkeleton } from './user-list-skeleton';

export interface UserListItem {
  id: string;
  email: string;
  /** Null for an account that never logged in. */
  firstLoginAt: string | null;
}

/**
 * Users with their loading, empty and error states. Takes the snapshot of an
 * Angular resource, so it needs no HTTP and stories pass plain objects. See
 * docs/adr/0018-loading-states-and-motion.md.
 */
@Component({
  selector: 'app-user-list',
  imports: [TranslocoPipe, HlmBadge, HlmButton, UserListSkeleton],
  template: `
    @switch (view()) {
      @case ('loading') {
        <app-user-list-skeleton />
      }
      @case ('error') {
        <section
          animate.enter="motion-alert"
          class="bg-card grid gap-3 rounded-xl border p-4 sm:p-6"
          role="alert"
        >
          <p class="text-destructive text-sm">
            {{ 'common.loadFailed' | transloco }}
          </p>
          <button
            hlmBtn
            variant="outline"
            class="w-full sm:w-auto sm:justify-self-start"
            (click)="retry.emit()"
          >
            {{ 'common.retry' | transloco }}
          </button>
        </section>
      }
      @case ('ready') {
        <section
          animate.enter="motion-swap"
          class="bg-card grid gap-3 rounded-xl border p-4 sm:p-6"
        >
          <h2 class="font-semibold">{{ 'users.title' | transloco }}</h2>
          <ul class="grid gap-1">
            @for (user of items(); track user.id) {
              <li
                class="flex min-h-11 items-center justify-between gap-2 border-b last:border-b-0"
              >
                <span class="truncate">{{ user.email }}</span>
                @if (user.firstLoginAt) {
                  <span hlmBadge variant="default">
                    {{ 'users.active' | transloco }}
                  </span>
                } @else {
                  <span hlmBadge variant="outline">
                    {{ 'users.neverLoggedIn' | transloco }}
                  </span>
                }
              </li>
            } @empty {
              <li class="text-muted-foreground text-sm">
                {{ 'users.empty' | transloco }}
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class UserList {
  readonly users =
    input.required<ResourceSnapshot<readonly UserListItem[] | undefined>>();
  readonly retry = output();

  /** A reload keeps the list on screen; only a first load shows the skeleton. */
  protected view(): 'loading' | 'error' | 'ready' {
    const users = this.users();
    if (users.status === 'error') {
      return 'error';
    }
    return users.value === undefined ? 'loading' : 'ready';
  }

  protected items(): readonly UserListItem[] {
    const users = this.users();
    return users.status === 'error' ? [] : (users.value ?? []);
  }
}
