import { HttpStatus, Logger } from '@nestjs/common';
import { getMetadataStorage, type ValidationError } from 'class-validator';
import type { FieldCode, FieldError } from '@boilerplate/contracts';
import { AppException } from './app-exception';

interface FieldRule {
  code: FieldCode;
  /** Builds params from the rule arguments, such as 8 in `@MinLength(8)`. */
  params?: (args: unknown[]) => Record<string, unknown>;
}

/**
 * class-validator rules mapped to our field codes. A rule missing here gives
 * INVALID_VALUE and a warning; add it when a DTO starts using it.
 */
const FIELD_RULES: Record<string, FieldRule> = {
  whitelistValidation: { code: 'UNKNOWN_FIELD' },
  isNotEmpty: { code: 'REQUIRED' },
  isDefined: { code: 'REQUIRED' },
  isString: { code: 'INVALID_TYPE', params: () => ({ expected: 'string' }) },
  isNumber: { code: 'INVALID_TYPE', params: () => ({ expected: 'number' }) },
  isInt: { code: 'INVALID_TYPE', params: () => ({ expected: 'integer' }) },
  isBoolean: { code: 'INVALID_TYPE', params: () => ({ expected: 'boolean' }) },
  isEmail: { code: 'INVALID_EMAIL' },
  minLength: { code: 'TOO_SHORT', params: ([min]) => ({ min }) },
  maxLength: { code: 'TOO_LONG', params: ([max]) => ({ max }) },
  isLength: {
    code: 'LENGTH_OUT_OF_RANGE',
    params: ([min, max]) => ({ min, max }),
  },
  min: { code: 'TOO_SMALL', params: ([min]) => ({ min }) },
  max: { code: 'TOO_LARGE', params: ([max]) => ({ max }) },
  isIn: { code: 'NOT_ALLOWED', params: ([values]) => ({ values }) },
};

const logger = new Logger('Validation');

/** For ValidationPipe: invalid fields become VALIDATION_ERROR details. */
export function validationException(errors: ValidationError[]): AppException {
  return new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', {
    details: errors.flatMap((error) => fieldErrors(error, '')),
  });
}

// Nested objects give paths such as `address.city`.
function fieldErrors(error: ValidationError, prefix: string): FieldError[] {
  const field = prefix + error.property;
  const own = Object.keys(error.constraints ?? {}).map((name): FieldError => {
    const rule = FIELD_RULES[name];
    if (!rule) {
      logger.warn(`No field code for the rule ${name}, add it`);
      return { field, code: 'INVALID_VALUE' };
    }
    const params = rule.params?.(ruleArgs(error, name));
    return { field, code: rule.code, ...(params && { params }) };
  });
  const nested = (error.children ?? []).flatMap((child) =>
    fieldErrors(child, `${field}.`),
  );
  return [...own, ...nested];
}

// The error carries only the rule name; its arguments are in the metadata of
// the DTO class.
function ruleArgs(error: ValidationError, name: string): unknown[] {
  if (!error.target) {
    return [];
  }
  return (
    getMetadataStorage()
      .getTargetValidationMetadatas(error.target.constructor, '', true, false)
      .find((m) => m.propertyName === error.property && m.name === name)
      ?.constraints ?? []
  );
}
