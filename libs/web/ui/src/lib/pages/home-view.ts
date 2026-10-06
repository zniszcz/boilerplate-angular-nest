import { Component, input, output } from '@angular/core';
import { UserSummary } from '../organisms/user-summary';
import { Stack } from '../templates/stack';

/** The start page: who is logged in. */
@Component({
  selector: 'app-home-view',
  imports: [Stack, UserSummary],
  template: `
    <app-stack>
      <app-user-summary
        [email]="email()"
        [permissions]="permissions()"
        (logout)="logout.emit()"
      />
    </app-stack>
  `,
})
export class HomeView {
  readonly email = input.required<string>();
  readonly permissions = input.required<readonly string[]>();
  readonly logout = output();
}
