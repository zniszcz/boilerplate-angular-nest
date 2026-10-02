import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '@boilerplate/web-auth';

@Component({
  selector: 'app-home-page',
  imports: [TranslocoPipe],
  templateUrl: './home-page.html',
})
export class HomePage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
