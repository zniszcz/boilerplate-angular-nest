import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { errorCode, type ErrorEnvelope } from '@boilerplate/contracts';
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
      const body: unknown =
        error instanceof HttpErrorResponse ? error.error : null;
      this.error.set(this.errorText(body));
    } finally {
      this.pending.set(false);
    }
  }

  /** Texts come from Transloco by code, never from the API. */
  private errorText(body: unknown): string {
    const code = errorCode(body);
    switch (code) {
      case 'AUTH_INVALID_CREDENTIALS':
        return this.transloco.translate(`errors.${code}`);
      case 'AUTH_TOO_MANY_ATTEMPTS': {
        const seconds = Number((body as ErrorEnvelope).params?.['retryAfter']);
        return this.transloco.translate(`errors.${code}`, {
          minutes: Math.max(1, Math.ceil(seconds / 60)),
        });
      }
      default:
        return this.transloco.translate('auth.login.failed');
    }
  }
}
