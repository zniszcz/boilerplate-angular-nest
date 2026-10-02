import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthStore } from '../auth.store';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal(false);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      await this.store.login(this.form.getRawValue());
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
