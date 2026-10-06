import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { errorCode } from '@boilerplate/contracts';
import { AuthStore } from '@boilerplate/web-auth';
import { type CreatedUser, UsersView } from '@boilerplate/web-ui';
import { UsersStore } from './users.store';

/** Connects UsersView to UsersStore and the user's permissions. */
@Component({
  selector: 'app-users-page',
  imports: [UsersView],
  providers: [UsersStore],
  template: `
    <app-users-view
      [users]="can('users:read') ? store.users.snapshot() : null"
      [canCreate]="can('users:create')"
      [creating]="creating()"
      [createError]="createError()"
      [created]="created()"
      (retry)="store.users.reload()"
      (create)="create($event)"
    />
  `,
})
export class UsersPage {
  protected readonly store = inject(UsersStore);
  private readonly auth = inject(AuthStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly created = signal<CreatedUser | null>(null);

  protected can(permission: string): boolean {
    return this.auth.permissions().includes(permission);
  }

  protected async create(email: string): Promise<void> {
    this.creating.set(true);
    this.createError.set(null);
    this.created.set(null);
    try {
      const { user, password } = await this.store.create(email);
      this.created.set({ email: user.email, password });
    } catch (error) {
      const code = errorCode(
        error instanceof HttpErrorResponse ? error.error : null,
      );
      this.createError.set(
        this.transloco.translate(
          code === 'USERS_EMAIL_TAKEN'
            ? `errors.${code}`
            : 'common.actionFailed',
        ),
      );
    } finally {
      this.creating.set(false);
    }
  }
}
