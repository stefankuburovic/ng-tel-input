import { CountryCode, PhoneNumber, getCountries, getCountryCallingCode, parsePhoneNumberFromString, validatePhoneNumberLength } from 'libphonenumber-js';

/** A country the picker offers. */
export interface TelCountry {
  /** ISO 3166-1 alpha-2, upper case, as libphonenumber-js names it (`DE`). */
  code: CountryCode;
  /** Calling code without the plus (`49`). */
  dialCode: string;
  /** The country's name in the display locale, from `Intl.DisplayNames`. */
  name: string;
  /** The flag as an emoji, built from the two regional indicator letters. */
  flag: string;
}

/**
 * Upper-cases an ISO code and checks it against the metadata, so callers may write `'de'` the way
 * most phone inputs take it.
 *
 * @returns `undefined` for anything libphonenumber-js has no metadata for.
 */
export function toCountryCode(code: string | null | undefined): CountryCode | undefined {
  const upper = code?.trim().toUpperCase();
  return upper && (getCountries() as string[]).includes(upper) ? (upper as CountryCode) : undefined;
}

/**
 * The country of a locale such as `de-DE` or `de-AT`, the default for a field nobody configured.
 *
 * @returns `undefined` for a locale without a region (`de`).
 */
export function localeCountry(locale: string): CountryCode | undefined {
  try {
    return toCountryCode(new Intl.Locale(locale).maximize().region);
  } catch {
    return undefined;
  }
}

/** The flag emoji for an ISO code. Windows fonts show the two letters instead, which still reads. */
function flagOf(code: string): string {
  return String.fromCodePoint(...[...code].map(letter => 0x1f1a5 + letter.charCodeAt(0)));
}

/**
 * Every country the metadata knows, named in `locale` and sorted by that name, with the
 * `preferred` ones (in their given order) split off for the top of the list.
 */
export function listCountries(locale: string, preferred: readonly string[]): { preferred: TelCountry[]; others: TelCountry[] } {
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    names = undefined;
  }
  const all = getCountries().map(code => ({
    code,
    dialCode: getCountryCallingCode(code),
    name: names?.of(code) ?? code,
    flag: flagOf(code)
  }));
  const top = preferred.map(toCountryCode).filter((code): code is CountryCode => !!code);
  return {
    preferred: top.map(code => all.find(country => country.code === code)).filter((country): country is TelCountry => !!country),
    others: all.filter(country => !top.includes(country.code)).sort((a, b) => a.name.localeCompare(b.name, locale))
  };
}

/**
 * Reads a number as typed or stored: international (`+49…`, `0049…`) on its own, national under
 * `country`.
 *
 * @returns `undefined` when there is nothing that could be a number yet.
 */
export function parseTel(text: string, country: CountryCode | undefined): PhoneNumber | undefined {
  const trimmed = text.trim().replace(/^00/, '+');
  return trimmed ? parsePhoneNumberFromString(trimmed, country) : undefined;
}

/**
 * The value a form gets for `text`: international format (`+49 30 1234567`) whenever the number
 * can be read, otherwise the text as typed, and `''` for an empty field.
 *
 * Unreadable text is passed through rather than dropped, so a half-typed number is still saved
 * as typed and the validator can say what is wrong with it.
 */
export function telValue(text: string, country: CountryCode | undefined): string {
  if (!text.trim()) {
    return '';
  }
  return parseTel(text, country)?.formatInternational() ?? text.trim();
}

/**
 * How the field shows a number: nationally (`030 1234567`) when it belongs to `country`, which
 * the picker already names, otherwise internationally, so the calling code is never lost.
 */
export function telDisplay(number: PhoneNumber, country: CountryCode | undefined): string {
  return number.country && number.country === country ? number.formatNational() : number.formatInternational();
}

/**
 * The error for a stored or typed number.
 *
 * @returns `null` for an empty or valid number, `{ numberTooLong: true }` when it has more digits
 *   than its country allows, else `{ invalidNumber: true }`.
 */
export function telErrors(value: unknown, country: CountryCode | undefined): { invalidNumber: true } | { numberTooLong: true } | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const number = parseTel(value, country);
  if (number?.isValid()) {
    return null;
  }
  const text = value.trim().replace(/^00/, '+');
  return validatePhoneNumberLength(text, country) === 'TOO_LONG' ? { numberTooLong: true } : { invalidNumber: true };
}
