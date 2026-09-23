import { Decimal } from 'decimal.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function generateAccountNumber(): string {
  const value = Math.floor(Math.random() * 10_000_000_000);
  return value.toString().padStart(10, '0');
}

export function formatMoneyString(value: string | number): string {
  return Decimal(value).toFixed(4);
}
