/**
 * Emails are kept in lower case, whatever the user typed, so one address
 * cannot belong to two accounts.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
