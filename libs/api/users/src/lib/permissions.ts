/**
 * Every permission the app knows. The seed command writes them to the
 * permissions table, so adding one here is enough.
 */
export const PERMISSIONS = {
  usersRead: 'users:read',
} as const;

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.usersRead]: 'List all users',
};
