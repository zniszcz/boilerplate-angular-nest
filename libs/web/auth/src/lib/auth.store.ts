import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import type { LoginDto, UserDto } from '@boilerplate/contracts';

interface AuthState {
  user: UserDto | null;
}

/**
 * The logged in user. The access token itself lives in an httpOnly cookie
 * that scripts cannot read, so the store only knows who is logged in.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({ user: null }),
  withComputed(({ user }) => ({
    isLoggedIn: computed(() => user() !== null),
    permissions: computed(() => user()?.permissions ?? []),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    /** Asks the API who is logged in. Called once when the app starts. */
    async loadMe(): Promise<void> {
      try {
        const user = await firstValueFrom(http.get<UserDto>('/api/users/me'));
        patchState(store, { user });
      } catch (error) {
        if (!(error instanceof HttpErrorResponse && error.status === 401)) {
          throw error;
        }
        patchState(store, { user: null });
      }
    },

    /** Rejects with HttpErrorResponse when the API refuses the login. */
    async login(credentials: LoginDto): Promise<void> {
      const user = await firstValueFrom(
        http.post<UserDto>('/api/auth/login', credentials),
      );
      patchState(store, { user });
    },

    async logout(): Promise<void> {
      await firstValueFrom(http.post<void>('/api/auth/logout', null));
      patchState(store, { user: null });
    },

    /** Forgets the user without calling the API, after a 401. */
    clear(): void {
      patchState(store, { user: null });
    },
  })),
);
