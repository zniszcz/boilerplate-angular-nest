import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { signalStore, withProps } from '@ngrx/signals';
import type { SuccessEnvelope, UserDto } from '@boilerplate/contracts';
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
);
