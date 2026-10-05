/**
 * The one catalog of response codes, shared by the API and the web app.
 * The frontend switches on these, never on a message text. See
 * docs/adr/0012-response-envelope.md. Group codes by a domain prefix.
 */
export const RESPONSE_CODES = [
  'OK',
  'VALIDATION_ERROR',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOO_MANY_ATTEMPTS',
  'AUTH_UNAUTHENTICATED',
  'AUTH_REFRESH_REJECTED',
  'AUTH_FORBIDDEN',
  'ROUTE_NOT_FOUND',
  // The fallback for exceptions nobody designed. Never return it on purpose.
  'UNEXPECTED_ERROR',
] as const;

export type ResponseCode = (typeof RESPONSE_CODES)[number];

/**
 * Codes of invalid fields in VALIDATION_ERROR details. Our own names, not
 * the validation library's, so changing the library does not change the API.
 */
export const FIELD_CODES = [
  'REQUIRED',
  'UNKNOWN_FIELD',
  // params: { expected: 'string' | 'number' | 'integer' | 'boolean' }
  'INVALID_TYPE',
  'INVALID_EMAIL',
  // params: { min }
  'TOO_SHORT',
  // params: { max }
  'TOO_LONG',
  // params: { min, max }
  'LENGTH_OUT_OF_RANGE',
  // params: { min }
  'TOO_SMALL',
  // params: { max }
  'TOO_LARGE',
  // params: { values }
  'NOT_ALLOWED',
  // The fallback for a rule with no code yet. Add the rule instead.
  'INVALID_VALUE',
] as const;

export type FieldCode = (typeof FIELD_CODES)[number];

export interface FieldError {
  field: string;
  code: FieldCode;
  params?: Record<string, unknown>;
}

export interface SuccessEnvelope<T> {
  status: 'success';
  code: ResponseCode;
  data: T;
}

export interface ErrorEnvelope {
  status: 'error';
  code: ResponseCode;
  params?: Record<string, unknown>;
  details?: FieldError[];
}

/** The code of a failed request, or null when the body has no envelope. */
export function errorCode(body: unknown): ResponseCode | null {
  return isErrorEnvelope(body) ? body.code : null;
}

export function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as ErrorEnvelope).status === 'error' &&
    (RESPONSE_CODES as readonly string[]).includes((body as ErrorEnvelope).code)
  );
}
