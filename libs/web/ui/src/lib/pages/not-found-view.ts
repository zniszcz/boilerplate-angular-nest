import { Component, output } from '@angular/core';
import { NotFound } from '../organisms/not-found';
import { CenteredCard } from '../templates/centered-card';

/** The page for every unknown address. */
@Component({
  selector: 'app-not-found-view',
  imports: [CenteredCard, NotFound],
  template: `
    <app-centered-card>
      <app-not-found (home)="home.emit()" />
    </app-centered-card>
  `,
})
export class NotFoundView {
  readonly home = output();
}
