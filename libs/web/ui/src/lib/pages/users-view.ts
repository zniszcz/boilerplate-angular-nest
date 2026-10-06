import { Component, input, output, type ResourceSnapshot } from '@angular/core';
import {
  CreateUserForm,
  type CreatedUser,
} from '../organisms/create-user-form';
import { UserList, type UserListItem } from '../organisms/user-list';
import { UserListSkeleton } from '../organisms/user-list-skeleton';
import { Stack } from '../templates/stack';

/**
 * Users: the form to add one, with `users:create`, and the list. The list is
 * secondary, so its code loads when it scrolls into view; until then the
 * same skeleton it shows while its data loads.
 */
@Component({
  selector: 'app-users-view',
  imports: [Stack, CreateUserForm, UserList, UserListSkeleton],
  template: `
    <app-stack>
      @if (canCreate()) {
        <app-create-user-form
          [pending]="creating()"
          [error]="createError()"
          [created]="created()"
          (submitted)="create.emit($event)"
        />
      }
      @if (users(); as users) {
        @defer (on viewport) {
          <app-user-list [users]="users" (retry)="retry.emit()" />
        } @placeholder {
          <app-user-list-skeleton />
        } @loading (after 150ms; minimum 300ms) {
          <app-user-list-skeleton />
        }
      }
    </app-stack>
  `,
})
export class UsersView {
  /** Null without `users:read`: the list is not shown at all. */
  readonly users = input<ResourceSnapshot<
    readonly UserListItem[] | undefined
  > | null>(null);
  readonly canCreate = input(false);
  readonly creating = input(false);
  /** Already translated. */
  readonly createError = input<string | null>(null);
  readonly created = input<CreatedUser | null>(null);
  readonly retry = output();
  readonly create = output<string>();
}
