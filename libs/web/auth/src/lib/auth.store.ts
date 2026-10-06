import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, map } from 'rxjs';
import {
  errorCode,
  type LoginDto,
  type SuccessEnvelope,
  type UserDto,
} from '@boilerplate/contracts';

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
        const user = await firstValueFrom(
          http
            .get<SuccessEnvelope<UserDto>>('/api/users/me')
            .pipe(map((response) => response.data)),
        );
        patchState(store, { user });
      } catch (error) {
        if (
          !(error instanceof HttpErrorResponse) ||
          errorCode(error.error) !== 'AUTH_UNAUTHENTICATED'
        ) {
          throw error;
        }
        patchState(store, { user: null });
      }
    },

    /**
     * Rejects with HttpErrorResponse when the API refuses the login. Its
     * `error` is the error envelope.
     */
    async login(credentials: LoginDto): Promise<void> {
      const user = await firstValueFrom(
        http
          .post<SuccessEnvelope<UserDto>>('/api/auth/login', credentials)
          .pipe(map((response) => response.data)),
      );
      patchState(store, { user });
    },

    async logout(): Promise<void> {
      await firstValueFrom(
        http.post<SuccessEnvelope<null>>('/api/auth/logout', null),
      );
      patchState(store, { user: null });
    },

    /**
     * Deletes the logged in user's account; the API removes the cookies.
     * Rejects with HttpErrorResponse when the API refuses.
     */
    async deleteAccount(password: string): Promise<void> {
      await firstValueFrom(
        http.delete<SuccessEnvelope<null>>('/api/users/me', {
          body: { password },
        }),
      );
      patchState(store, { user: null });
    },

    /** Updates the user, for example with fresh permissions after a refresh. */
    setUser(user: UserDto): void {
      patchState(store, { user });
    },

    /** Forgets the user without calling the API, after a 401. */
    clear(): void {
      patchState(store, { user: null });
    },
  })),
);
