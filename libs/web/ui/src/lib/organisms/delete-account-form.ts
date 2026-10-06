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

/** Asks for the current password before the account is deleted. */
@Component({
  selector: 'app-delete-account-form',
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
      class="bg-card border-destructive/40 grid gap-4 rounded-xl border p-4 sm:p-6"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <h2 class="font-semibold">{{ 'account.delete.title' | transloco }}</h2>
      <p class="text-muted-foreground text-sm">
        {{ 'account.delete.warning' | transloco }}
      </p>

      <app-form-field
        [label]="'account.delete.password' | transloco"
        [error]="showError() ? ('auth.login.required' | transloco) : null"
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
          animate.enter="motion-alert"
          class="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          role="alert"
        >
          {{ error }}
        </p>
      }

      <button
        hlmBtn
        variant="destructive"
        type="submit"
        class="w-full sm:w-auto sm:justify-self-start"
        [disabled]="pending()"
      >
        @if (pending()) {
          <hlm-spinner [aria-label]="'common.loading' | transloco" />
        }
        {{ 'account.delete.submit' | transloco }}
      </button>
    </form>
  `,
})
export class DeleteAccountForm {
  readonly pending = input(false);
  /** Already translated. */
  readonly error = input<string | null>(null);
  readonly submitted = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', Validators.required],
  });

  protected showError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue().password);
  }
}
