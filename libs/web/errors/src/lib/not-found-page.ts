import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CenteredCard, NotFound } from '@boilerplate/web-ui';

/** For every unknown address. The address stays in the browser bar. */
@Component({
  selector: 'app-not-found-page',
  imports: [CenteredCard, NotFound],
  template: `
    <app-centered-card>
      <app-not-found (home)="home()" />
    </app-centered-card>
  `,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  protected home(): void {
    void this.router.navigate(['/']);
  }
}
