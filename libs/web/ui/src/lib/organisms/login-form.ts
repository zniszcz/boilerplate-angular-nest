import { Component, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { FormField } from '../molecules/form-field';

export interface LoginFormValue {
  email: string;
  password: string;
}

/** Validates the fields and emits them. Knows nothing about the API. */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, TranslocoPipe, Button, Input, FormField],
  template: `
    <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <h1 class="text-2xl font-semibold">
        {{ 'auth.login.title' | transloco }}
      </h1>

      <app-form-field
        [label]="'auth.login.email' | transloco"
        [error]="
          showError('email') ? ('auth.login.emailInvalid' | transloco) : null
        "
      >
        <input
          appInput
          type="email"
          formControlName="email"
          autocomplete="username"
        />
      </app-form-field>

      <app-form-field
        [label]="'auth.login.password' | transloco"
        [error]="
          showError('password') ? ('auth.login.required' | transloco) : null
        "
      >
        <input
          appInput
          type="password"
          formControlName="password"
          autocomplete="current-password"
        />
      </app-form-field>

      @if (error(); as error) {
        <p class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {{ error }}
        </p>
      }

      <app-button type="submit" [disabled]="pending()">
        {{ 'auth.login.submit' | transloco }}
      </app-button>
    </form>
  `,
})
export class LoginForm {
  readonly pending = input(false);
  /** Already translated, for example a message from the API. */
  readonly error = input<string | null>(null);
  readonly submitted = output<LoginFormValue>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected showError(field: keyof LoginFormValue): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
