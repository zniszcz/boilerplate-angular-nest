import { HttpClient, httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { signalStore, withMethods, withProps } from '@ngrx/signals';
import { firstValueFrom, map } from 'rxjs';
import type {
  CreatedUserDto,
  SuccessEnvelope,
  UserDto,
} from '@boilerplate/contracts';
import { AuthStore } from '@boilerplate/web-auth';

/**
 * Remote data as an Angular httpResource: status, value, error, reload.
 * Pages pass `users.snapshot()` to organisms. See
 * docs/adr/0018-loading-states-and-motion.md.
 */
export const UsersStore = signalStore(
  withProps(() => {
    const auth = inject(AuthStore);
    return {
      // No URL, no request: the resource stays idle without the permission.
      users: httpResource<UserDto[]>(
        () =>
          auth.permissions().includes('users:read') ? '/api/users' : undefined,
        { parse: (body) => (body as SuccessEnvelope<UserDto[]>).data },
      ),
    };
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    /**
     * Adds an account and reloads the list. Rejects with HttpErrorResponse
     * when the API refuses; its `error` is the error envelope.
     */
    async create(email: string): Promise<CreatedUserDto> {
      const created = await firstValueFrom(
        http
          .post<SuccessEnvelope<CreatedUserDto>>('/api/users', { email })
          .pipe(map((response) => response.data)),
      );
      store.users.reload();
      return created;
    },
  })),
);
