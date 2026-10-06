import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotFoundView } from '@boilerplate/web-ui';

/** For every unknown address. The address stays in the browser bar. */
@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundView],
  template: ` <app-not-found-view (home)="home()" /> `,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  protected home(): void {
    void this.router.navigate(['/']);
  }
}
