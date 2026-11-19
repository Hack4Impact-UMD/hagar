export const MIN_PASSWORD_LENGTH = 8;

/** Whether `password` is acceptable as a new password. */
export function isValidNewPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
