import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import {
  CenteredCard,
  LoginForm,
  type LoginFormValue,
} from '@boilerplate/web-ui';
import { AuthStore } from '../auth.store';

@Component({
  selector: 'app-login-page',
  imports: [CenteredCard, LoginForm],
  template: `
    <app-centered-card>
      <app-login-form
        [pending]="pending()"
        [error]="error()"
        (submitted)="login($event)"
      />
    </app-centered-card>
  `,
})
export class LoginPage {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal(false);

  protected async login(credentials: LoginFormValue): Promise<void> {
    this.pending.set(true);
    this.error.set(null);
    try {
      await this.store.login(credentials);
      await this.router.navigate(['/']);
    } catch (error) {
      // The API already translated the message to the current language.
      const message =
        error instanceof HttpErrorResponse ? error.error?.message : null;
      this.error.set(
        typeof message === 'string'
          ? message
          : this.transloco.translate('auth.login.failed'),
      );
    } finally {
      this.pending.set(false);
    }
  }
}
