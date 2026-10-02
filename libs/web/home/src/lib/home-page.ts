import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@boilerplate/web-auth';
import { UserSummary } from '@boilerplate/web-ui';

@Component({
  selector: 'app-home-page',
  imports: [UserSummary],
  template: `
    <app-user-summary
      [email]="auth.user()?.email ?? ''"
      [permissions]="auth.permissions()"
      (logout)="logout()"
    />
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
