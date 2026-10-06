import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthStore } from '@boilerplate/web-auth';
import { MainNav, type NavItem } from '@boilerplate/web-ui';

/**
 * Links to the pages the logged in user may open; nothing when logged out.
 * MainNav knows no router, so this connects it.
 */
@Component({
  selector: 'app-navigation',
  imports: [MainNav],
  template: `
    @if (auth.isLoggedIn()) {
      <app-main-nav
        [items]="items()"
        [active]="url()"
        (navigate)="go($event)"
      />
    }
  `,
})
export class AppNavigation {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url },
  );

  protected readonly items = computed((): NavItem[] => {
    const permissions = this.auth.permissions();
    const canSeeUsers =
      permissions.includes('users:read') ||
      permissions.includes('users:create');
    return [
      { path: '/', label: 'nav.home' },
      ...(canSeeUsers ? [{ path: '/users', label: 'nav.users' }] : []),
      { path: '/account', label: 'nav.account' },
    ];
  });

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
