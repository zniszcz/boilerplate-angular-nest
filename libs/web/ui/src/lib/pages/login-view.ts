import { Component, input, output } from '@angular/core';
import { LoginForm, type LoginFormValue } from '../organisms/login-form';
import { CenteredCard } from '../templates/centered-card';

/** The login page. */
@Component({
  selector: 'app-login-view',
  imports: [CenteredCard, LoginForm],
  template: `
    <app-centered-card>
      <app-login-form
        [pending]="pending()"
        [error]="error()"
        (submitted)="submitted.emit($event)"
      />
    </app-centered-card>
  `,
})
export class LoginView {
  readonly pending = input(false);
  /** Already translated. */
  readonly error = input<string | null>(null);
  readonly submitted = output<LoginFormValue>();
}
