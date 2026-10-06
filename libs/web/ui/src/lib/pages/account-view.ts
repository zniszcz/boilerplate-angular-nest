import { Component, input, output } from '@angular/core';
import { DeleteAccountForm } from '../organisms/delete-account-form';
import { Stack } from '../templates/stack';

/** The logged in user's account: for now, deleting it. */
@Component({
  selector: 'app-account-view',
  imports: [Stack, DeleteAccountForm],
  template: `
    <app-stack>
      <app-delete-account-form
        [pending]="deleting()"
        [error]="deleteError()"
        (submitted)="deleteAccount.emit($event)"
      />
    </app-stack>
  `,
})
export class AccountView {
  readonly deleting = input(false);
  /** Already translated. */
  readonly deleteError = input<string | null>(null);
  readonly deleteAccount = output<string>();
}
