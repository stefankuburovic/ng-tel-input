import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { injectTelInputOptions } from './tel-input-config';
import { listCountries } from './tel-format';
import { TelInputDirective } from './tel-input.directive';

/**
 * The country picker of a `telInput`: shows the selected country's flag and calling code, and
 * opens the browser's own list on click, so it is keyboard and screen reader friendly on every
 * platform without an overlay library.
 *
 * Country names come from `Intl.DisplayNames` in `LOCALE_ID`, so the package ships no names.
 * Inside an Angular Material form field, put it in the `matPrefix` slot.
 */
@Component({
  selector: 'tel-country-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tel-country-select',
    '[class.tel-country-select--disabled]': 'for().disabled()'
  },
  template: `
    <span class="tel-country-select__value" aria-hidden="true">
      @if (selected(); as country) {
        <span class="tel-country-select__flag">{{ country.flag }}</span>
        <span class="tel-country-select__dial">+{{ country.dialCode }}</span>
      }
      <span class="tel-country-select__arrow"></span>
    </span>
    <select
      class="tel-country-select__native"
      [attr.aria-label]="label()"
      [disabled]="for().disabled()"
      (change)="pick($event)"
    >
      @for (country of countries().preferred; track country.code) {
        <option [value]="country.code" [selected]="country.code === for().country()">
          {{ country.name }} +{{ country.dialCode }}
        </option>
      }
      @if (countries().preferred.length) {
        <option disabled>──────────</option>
      }
      @for (country of countries().others; track country.code) {
        <option [value]="country.code" [selected]="country.code === for().country()">
          {{ country.name }} +{{ country.dialCode }}
        </option>
      }
    </select>
  `,
  styles: `
    /* Own line height: Material's matPrefix slot is built for icons and sets line-height: 0,
       which collapsed the picker (and the select over it) to 4.5px. No min-height, so the picker
       fits a one-line field as well. */
    :host {
      position: relative;
      display: inline-flex;
      align-items: center;
      line-height: normal;
      white-space: nowrap;
      cursor: pointer;
    }
    :host(.tel-country-select--disabled) {
      cursor: default;
      opacity: 0.6;
    }
    :host:has(.tel-country-select__native:focus-visible) .tel-country-select__value {
      outline: 2px solid currentColor;
      outline-offset: 3px;
      border-radius: 2px;
    }
    .tel-country-select__value {
      display: inline-flex;
      align-items: center;
      gap: 0.3em;
    }
    .tel-country-select__arrow {
      width: 0;
      height: 0;
      margin-left: 0.15em;
      border: 0.3em solid transparent;
      border-top-color: currentColor;
      border-bottom: 0;
      opacity: 0.6;
    }
    .tel-country-select__native {
      position: absolute;
      inset: 0;
      width: 100%;
      opacity: 0;
      cursor: inherit;
      font: inherit;
    }
  `
})
export class TelCountrySelectComponent {
  /** The phone field this picker belongs to. */
  readonly for = input.required<TelInputDirective>();
  /** Countries listed first, in this order; ISO codes in either case. */
  readonly preferredCountries = input<readonly string[]>();
  /** Accessible name of the list; the visible part is only a flag and a code. */
  readonly label = input('Country');

  /** What {@link provideTelInput} and `LOCALE_ID` set, read once. */
  private readonly options = injectTelInputOptions();
  /** The list, built once per `preferredCountries`. */
  protected readonly countries = computed(() =>
    listCountries(this.options.locale, this.preferredCountries() ?? this.options.preferredCountries ?? [])
  );
  /** The selected country's entry, for the visible part. */
  protected readonly selected = computed(() => {
    const code = this.for().country();
    const { preferred, others } = this.countries();
    return preferred.find(country => country.code === code) ?? others.find(country => country.code === code);
  });

  /** Hands the chosen option to the phone field. */
  protected pick(event: Event): void {
    this.for().selectCountry((event.target as HTMLSelectElement).value);
  }
}
