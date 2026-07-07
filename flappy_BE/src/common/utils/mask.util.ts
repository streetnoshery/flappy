/**
 * Masking utilities for sensitive fields in API responses.
 * Use these before returning financial or account data.
 */

/** Mask all but the last 4 digits of a card/account number */
export function maskCardNumber(num: string): string {
  if (!num || num.length < 4) return '****';
  return '*'.repeat(num.length - 4) + num.slice(-4);
}

/** Mask an account number — show first 2 and last 3 */
export function maskAccountNumber(num: string): string {
  if (!num || num.length < 6) return '****';
  return num.slice(0, 2) + '*'.repeat(num.length - 5) + num.slice(-3);
}

/** Mask email: jo***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/** Strip fields that should never leave the server in a response object */
export function stripSensitiveFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): Omit<T, typeof fields[number]> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}
