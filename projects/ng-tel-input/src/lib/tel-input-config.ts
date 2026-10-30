import { InjectionToken, LOCALE_ID, Provider, inject } from '@angular/core';
import type { Examples } from 'libphonenumber-js';

/**
 * App-wide defaults for `telInput`, `tel-country-select` and `tel-country-menu`, set with
 * {@link provideTelInput}.
 */
export interface TelInputOptions {
  /**
   * The country a national number is read in until the user picks another, as an ISO code in
   * either case. Defaults to the region of `LOCALE_ID`.
   */
  defaultCountry?: string;
  /** Countries listed first in the picker, in this order. */
  preferredCountries?: readonly string[];
  /**
   * Example numbers for the placeholder, `import examples from 'libphonenumber-js/mobile/examples'`
   * (about 1.4 kB gzipped). Left out, fields show no example.
   */
  examples?: Examples;
}

/** Holds what {@link provideTelInput} set. */
export const TEL_INPUT_OPTIONS = new InjectionToken<TelInputOptions>('TEL_INPUT_OPTIONS', { factory: () => ({}) });

/**
 * Sets the defaults every `telInput` and `tel-country-select` under this injector starts from; an
 * input set on the element still wins.
 *
 * ```ts
 * provideTelInput({ defaultCountry: 'de', preferredCountries: ['de', 'at', 'ch'] })
 * ```
 */
export function provideTelInput(options: TelInputOptions): Provider {
  return { provide: TEL_INPUT_OPTIONS, useValue: options };
}

/** The options of the current injector plus `LOCALE_ID`. Must run in an injection context. */
export function injectTelInputOptions(): TelInputOptions & { locale: string } {
  return { locale: inject(LOCALE_ID), ...inject(TEL_INPUT_OPTIONS) };
}
