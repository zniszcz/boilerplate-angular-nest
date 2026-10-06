import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { errorCode } from '@boilerplate/contracts';
import { AuthStore } from '@boilerplate/web-auth';
import { AccountView } from '@boilerplate/web-ui';

/** Connects AccountView to AuthStore: deleting the own account. */
@Component({
  selector: 'app-account-page',
  imports: [AccountView],
  template: `
    <app-account-view
      [deleting]="deleting()"
      [deleteError]="deleteError()"
      (deleteAccount)="deleteAccount($event)"
    />
  `,
})
export class AccountPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected async deleteAccount(password: string): Promise<void> {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.auth.deleteAccount(password);
      await this.router.navigate(['/login']);
    } catch (error) {
      const code = errorCode(
        error instanceof HttpErrorResponse ? error.error : null,
      );
      switch (code) {
        case 'USERS_WRONG_PASSWORD':
        case 'USERS_LAST_ADMIN':
          this.deleteError.set(this.transloco.translate(`errors.${code}`));
          break;
        default:
          this.deleteError.set(this.transloco.translate('common.actionFailed'));
      }
    } finally {
      this.deleting.set(false);
    }
  }
}
