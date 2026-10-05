import { Component, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@boilerplate/web-helm/button';
import { HlmInput } from '@boilerplate/web-helm/input';
import { FormField } from '../molecules/form-field';

export interface LoginFormValue {
  email: string;
  password: string;
}

/** Validates the fields and emits them. Knows nothing about the API. */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, TranslocoPipe, HlmButton, HlmInput, FormField],
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
          hlmInput
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
          hlmInput
          type="password"
          formControlName="password"
          autocomplete="current-password"
        />
      </app-form-field>

      @if (error(); as error) {
        <p
          class="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {{ error }}
        </p>
      }

      <button
        hlmBtn
        type="submit"
        class="w-full sm:w-auto sm:justify-self-start"
        [disabled]="pending()"
      >
        {{ 'auth.login.submit' | transloco }}
      </button>
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
