import { Directive, ElementRef, computed, forwardRef, inject, input, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { CountryCode } from 'libphonenumber-js';

import { injectTelInputOptions } from './tel-input-config';
import { localeCountry, parseTel, telDisplay, telErrors, telValue, toCountryCode } from './tel-format';

/**
 * Turns a text input into a phone number field. The form control holds the number in
 * international format (`+49 30 1234567`), and the field shows it nationally
 * (`030 1234567`) next to a `tel-country-select` that names the country.
 *
 * ```html
 * <tel-country-select [for]="phone" />
 * <input telInput #phone="telInput" formControlName="phone" />
 * ```
 *
 * A number typed with its calling code (`+43…`, `0043…`) selects its own country. A national
 * number is read in the selected country, which starts at `defaultCountry`.
 *
 * Writing a value never changes it, so a number stored nationally (`0301234567`) stays as stored
 * until the user edits the field. It is still shown and validated under the selected country.
 *
 * Also a validator: `invalidNumber` or `numberTooLong`, never for an empty field (pair it with
 * `Validators.required` for that).
 */
@Directive({
  selector: 'input[telInput]',
  exportAs: 'telInput',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TelInputDirective), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => TelInputDirective), multi: true }
  ],
  host: {
    type: 'tel',
    autocomplete: 'tel',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()'
  }
})
export class TelInputDirective implements ControlValueAccessor, Validator {
  /** The country a national number is read in until the user picks one; ISO code, either case. */
  readonly defaultCountry = input<string>();

  /** What {@link provideTelInput} and `LOCALE_ID` set, read once. */
  private readonly options = injectTelInputOptions();
  /** The country the user or the last number picked; `undefined` until either happened. */
  private readonly picked = signal<CountryCode | undefined>(undefined);
  /** The selected country: the picked one, else `defaultCountry`, else the locale's. */
  readonly country = computed(
    () => this.picked() ?? toCountryCode(this.defaultCountry() ?? this.options.defaultCountry) ?? localeCountry(this.options.locale)
  );
  /** Mirrors the control's disabled state, so the country picker can follow it. */
  readonly disabled = signal(false);

  /** The element the directive sits on. */
  private readonly element: HTMLInputElement = inject(ElementRef<HTMLInputElement>).nativeElement;
  /** The value the control has, so an edit that keeps the number is not reported. */
  private value = '';
  /** The form's change callback. */
  private onChange: (value: string) => void = () => undefined;
  /** The form's touched callback. */
  private onTouched: () => void = () => undefined;
  /** Re-runs the validator; called when the country changes. */
  private onValidatorChange: () => void = () => undefined;

  /** Shows a value from the model, selecting its country when it has one. */
  writeValue(value: unknown): void {
    const text = typeof value === 'string' ? value : '';
    this.value = text;
    const number = parseTel(text, this.country());
    if (number?.country) {
      this.picked.set(number.country);
    }
    this.element.value = number ? telDisplay(number, this.country()) : text;
  }

  /** Part of `ControlValueAccessor`. */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /** Part of `ControlValueAccessor`. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Part of `ControlValueAccessor`. */
  setDisabledState(disabled: boolean): void {
    this.element.disabled = disabled;
    this.disabled.set(disabled);
  }

  /** Part of `Validator`: see the class comment. */
  validate(control: AbstractControl): ValidationErrors | null {
    return telErrors(control.value, this.country());
  }

  /** Part of `Validator`. */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /**
   * Selects a country, as the picker does, and re-reads the typed number in it. The control only
   * hears about it when the value changes, which a number typed with its calling code does not.
   */
  selectCountry(code: string): void {
    const country = toCountryCode(code);
    if (!country || country === this.country()) {
      return;
    }
    this.picked.set(country);
    this.onValidatorChange();
    this.emit(telValue(this.element.value, country));
  }

  /** Reports every edit, and lets a number typed with its calling code pick its country. */
  protected onInput(): void {
    const text = this.element.value;
    if (/^\s*(\+|00)/.test(text)) {
      const country = parseTel(text, undefined)?.country;
      if (country && country !== this.country()) {
        this.picked.set(country);
        this.onValidatorChange();
      }
    }
    this.emit(telValue(text, this.country()));
  }

  /** Shows a readable number in its tidy form and marks the control touched. */
  protected onBlur(): void {
    const number = parseTel(this.element.value, this.country());
    if (number) {
      this.element.value = telDisplay(number, this.country());
    }
    this.onTouched();
  }

  /** Hands `value` to the form when it differs from what the control has. */
  private emit(value: string): void {
    if (value !== this.value) {
      this.value = value;
      this.onChange(value);
    }
  }
}
