import { Component, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@boilerplate/web-helm/button';

/** The address leads nowhere. The page decides where "home" is. */
@Component({
  selector: 'app-not-found',
  imports: [TranslocoPipe, HlmButton],
  template: `
    <section animate.enter="motion-appear" class="grid gap-4">
      <p class="text-muted-foreground text-sm font-medium">404</p>
      <h1 class="text-2xl font-semibold">
        {{ 'notFound.title' | transloco }}
      </h1>
      <p class="text-muted-foreground">{{ 'notFound.text' | transloco }}</p>
      <button
        hlmBtn
        class="w-full sm:w-auto sm:justify-self-start"
        (click)="home.emit()"
      >
        {{ 'notFound.home' | transloco }}
      </button>
    </section>
  `,
})
export class NotFound {
  readonly home = output();
}
