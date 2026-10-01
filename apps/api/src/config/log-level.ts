import type { LogLevel } from '@nestjs/common';

const LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

/**
 * Maps LOG_LEVEL to the Nest log levels that should be printed.
 * Accepts Nest names and `info` as an alias of `log`. Defaults to `log`.
 */
export function logLevelsFromEnv(value = process.env.LOG_LEVEL): LogLevel[] {
  const name = value === 'info' ? 'log' : value;
  const index = LEVELS.indexOf(name as LogLevel);
  return LEVELS.slice(0, (index === -1 ? LEVELS.indexOf('log') : index) + 1);
}
