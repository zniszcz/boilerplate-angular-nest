import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@boilerplate/web-auth';
import {
  Stack,
  UserList,
  UserListSkeleton,
  UserSummary,
} from '@boilerplate/web-ui';
import { UsersStore } from './users.store';

/**
 * Only places organisms and connects them to stores. The user list is
 * secondary, so its code loads when it scrolls into view; until then the
 * same skeleton it shows while its data loads.
 */
@Component({
  selector: 'app-home-page',
  imports: [Stack, UserSummary, UserList, UserListSkeleton],
  providers: [UsersStore],
  template: `
    <app-stack>
      <app-user-summary
        [email]="auth.user()?.email ?? ''"
        [permissions]="auth.permissions()"
        (logout)="logout()"
      />
      @if (canListUsers()) {
        @defer (on viewport) {
          <app-user-list
            [users]="store.users.snapshot()"
            (retry)="store.users.reload()"
          />
        } @placeholder {
          <app-user-list-skeleton />
        } @loading (after 150ms; minimum 300ms) {
          <app-user-list-skeleton />
        }
      }
    </app-stack>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthStore);
  protected readonly store = inject(UsersStore);
  private readonly router = inject(Router);

  protected canListUsers(): boolean {
    return this.auth.permissions().includes('users:read');
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
