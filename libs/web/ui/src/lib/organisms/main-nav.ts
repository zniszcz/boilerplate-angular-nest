import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export interface NavItem {
  path: string;
  /** Transloco key. */
  label: string;
}

/**
 * Links between pages. Knows no router: it emits the path, and the shell
 * navigates, so stories need no routes.
 */
@Component({
  selector: 'app-main-nav',
  imports: [TranslocoPipe],
  template: `
    <nav class="flex gap-1 overflow-x-auto">
      @for (item of items(); track item.path) {
        <a
          [href]="item.path"
          class="hover:bg-muted flex h-11 shrink-0 items-center rounded-md px-3 text-sm"
          [class.bg-muted]="item.path === active()"
          [class.font-semibold]="item.path === active()"
          [attr.aria-current]="item.path === active() ? 'page' : null"
          (click)="go($event, item.path)"
        >
          {{ item.label | transloco }}
        </a>
      }
    </nav>
  `,
})
export class MainNav {
  readonly items = input.required<readonly NavItem[]>();
  readonly active = input<string | null>(null);
  readonly navigate = output<string>();

  protected go(event: MouseEvent, path: string): void {
    // Keeps a middle click or ctrl+click opening a new tab.
    if (event.button !== 0 || event.ctrlKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    this.navigate.emit(path);
  }
}
