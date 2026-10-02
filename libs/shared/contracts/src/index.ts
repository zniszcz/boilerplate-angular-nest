// Types of the API, generated from the backend DTO classes by
// `pnpm contracts:generate`. Do not edit api.generated.ts by hand.
import type { components } from './lib/api.generated';

export type { paths } from './lib/api.generated';

type Schemas = components['schemas'];
export type HelloDto = Schemas['HelloDto'];
export type LoginDto = Schemas['LoginDto'];
export type UserDto = Schemas['UserDto'];
