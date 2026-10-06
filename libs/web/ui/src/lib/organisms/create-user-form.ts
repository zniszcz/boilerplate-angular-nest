import { Component, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@boilerplate/web-helm/button';
import { HlmInput } from '@boilerplate/web-helm/input';
import { HlmSpinner } from '@boilerplate/web-helm/spinner';
import { FormField } from '../molecules/form-field';

/** An account just created, with the password the API shows only once. */
export interface CreatedUser {
  email: string;
  password: string;
}

/** Takes an email for a new account and shows its starting password. */
@Component({
  selector: 'app-create-user-form',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    HlmButton,
    HlmInput,
    HlmSpinner,
    FormField,
  ],
  template: `
    <form
      class="bg-card grid gap-4 rounded-xl border p-4 sm:p-6"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <h2 class="font-semibold">{{ 'users.create.title' | transloco }}</h2>

      <app-form-field
        [label]="'users.create.email' | transloco"
        [error]="showError() ? ('auth.login.emailInvalid' | transloco) : null"
      >
        <input hlmInput type="email" formControlName="email" />
      </app-form-field>

      @if (error(); as error) {
        <p
          animate.enter="motion-alert"
          class="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {{ error }}
        </p>
      }

      @if (created(); as created) {
        <div
          animate.enter="motion-alert"
          class="bg-muted grid gap-1 rounded-md p-3 text-sm"
          role="status"
        >
          <p>
            {{ 'users.create.created' | transloco: { email: created.email } }}
          </p>
          <p class="font-mono text-base break-all" data-testid="new-password">
            {{ created.password }}
          </p>
          <p class="text-muted-foreground">
            {{ 'users.create.passwordOnce' | transloco }}
          </p>
        </div>
      }

      <button
        hlmBtn
        type="submit"
        class="w-full sm:w-auto sm:justify-self-start"
        [disabled]="pending()"
      >
        @if (pending()) {
          <hlm-spinner [aria-label]="'common.loading' | transloco" />
        }
        {{ 'users.create.submit' | transloco }}
      </button>
    </form>
  `,
})
export class CreateUserForm {
  readonly pending = input(false);
  /** Already translated. */
  readonly error = input<string | null>(null);
  readonly created = input<CreatedUser | null>(null);
  readonly submitted = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected showError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue().email);
    this.form.reset();
  }
}
