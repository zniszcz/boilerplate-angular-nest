import type { MigrationInterface } from 'typeorm';
import { Init1790948905704 } from './1790948905704-Init';

// Every migration must be listed here, in the order it was generated.
// The build bundles them, so a migration missing here never runs.
export const MIGRATIONS: (new () => MigrationInterface)[] = [Init1790948905704];
