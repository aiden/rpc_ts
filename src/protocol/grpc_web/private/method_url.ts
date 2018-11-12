/**
 * Deal with method URLs
 *
 * @module
 */

export type FullMethodParts = {
  remoteServiceAddress?: string;
  method: string;
};

export function getFullMethodUrl(parts: FullMethodParts): string {
  return `${parts.remoteServiceAddress || ''}/${parts.method}`;
}

export function isLowerCamelCase(identifier: string) {
  return /^[a-z][A-Za-z0-9]*$/.test(identifier);
}
