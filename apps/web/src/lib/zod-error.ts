import type { ZodError } from 'zod';

/** Zodの検証結果を `items.0.quantity` のようなキーでフィールドへ対応付ける。 */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
