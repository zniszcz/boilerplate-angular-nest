import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitcher } from '@boilerplate/web-i18n';
import { AppNavigation } from '@boilerplate/web-shell';
import { AppHeader, PageLayout } from '@boilerplate/web-ui';

/** Composition only. Components live in libs/web. */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AppHeader,
    PageLayout,
    LanguageSwitcher,
    AppNavigation,
  ],
  template: `
    <app-page-layout>
      <app-header layoutHeader title="Boilerplate">
        <app-language-switcher />
        <app-navigation headerNav />
      </app-header>
      <router-outlet />
    </app-page-layout>
  `,
})
export class App {}
