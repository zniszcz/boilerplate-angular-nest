import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { errorCode } from '@boilerplate/contracts';
import { AuthStore } from '@boilerplate/web-auth';
import {
  CreateUserForm,
  type CreatedUser,
  DeleteAccountForm,
  Stack,
  UserList,
  UserListSkeleton,
  UserSummary,
} from '@boilerplate/web-ui';
import { UsersStore } from './users.store';

/**
 * The logged in user's page: who they are, the users they may see or add,
 * and deleting their own account. Only places organisms and connects them to
 * stores. The user list is secondary, so its code loads when it scrolls into
 * view; until then the same skeleton it shows while its data loads.
 */
@Component({
  selector: 'app-home-page',
  imports: [
    Stack,
    UserSummary,
    UserList,
    UserListSkeleton,
    CreateUserForm,
    DeleteAccountForm,
  ],
  providers: [UsersStore],
  template: `
    <app-stack>
      <app-user-summary
        [email]="auth.user()?.email ?? ''"
        [permissions]="auth.permissions()"
        (logout)="logout()"
      />
      @if (can('users:create')) {
        <app-create-user-form
          [pending]="creating()"
          [error]="createError()"
          [created]="created()"
          (submitted)="createUser($event)"
        />
      }
      @if (can('users:read')) {
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
      <app-delete-account-form
        [pending]="deleting()"
        [error]="deleteError()"
        (submitted)="deleteAccount($event)"
      />
    </app-stack>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthStore);
  protected readonly store = inject(UsersStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly created = signal<CreatedUser | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected can(permission: string): boolean {
    return this.auth.permissions().includes(permission);
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  protected async createUser(email: string): Promise<void> {
    this.creating.set(true);
    this.createError.set(null);
    this.created.set(null);
    try {
      const { user, password } = await this.store.create(email);
      this.created.set({ email: user.email, password });
    } catch (error) {
      this.createError.set(this.errorText(error, 'USERS_EMAIL_TAKEN'));
    } finally {
      this.creating.set(false);
    }
  }

  protected async deleteAccount(password: string): Promise<void> {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.auth.deleteAccount(password);
      await this.router.navigate(['/login']);
    } catch (error) {
      this.deleteError.set(
        this.errorText(error, 'USERS_WRONG_PASSWORD', 'USERS_LAST_ADMIN'),
      );
    } finally {
      this.deleting.set(false);
    }
  }

  /** Texts come from Transloco by code; other codes get a general text. */
  private errorText(error: unknown, ...expected: string[]): string {
    const code = errorCode(
      error instanceof HttpErrorResponse ? error.error : null,
    );
    return code && expected.includes(code)
      ? this.transloco.translate(`errors.${code}`)
      : this.transloco.translate('common.actionFailed');
  }
}
