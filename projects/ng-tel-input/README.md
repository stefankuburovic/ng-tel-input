# @stefankuburovic/ng-tel-input

A phone number input for Angular forms, built on
[libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js).

- The form control holds the number in **international format** (`+49 30 1234567`), and the field
  shows it **nationally** (`030 1234567`) next to the country's flag and calling code.
- A number typed with its calling code (`+43…` or `0043…`) selects its own country.
- The country picker is the browser's own `<select>`, so keyboard, screen reader and mobile
  support come for free. Names come from `Intl.DisplayNames` in your `LOCALE_ID`, so nothing is
  shipped for them.
- A validator is built in (`invalidNumber`, `numberTooLong`).
- Signals, zoneless, standalone. Angular Material is optional: put the picker in `matPrefix`.
- **2.8 kB** min+gzip plus libphonenumber-js (about 29 kB with its default metadata), against
  roughly 116 kB for google-libphonenumber alone.

```sh
npm install @stefankuburovic/ng-tel-input
```

## Usage

```ts
import { TelCountrySelectComponent, TelInputDirective } from '@stefankuburovic/ng-tel-input';
```

```html
<!-- plain -->
<tel-country-select [for]="phone" [preferredCountries]="['de', 'at', 'ch']" />
<input telInput #phone="telInput" defaultCountry="de" formControlName="phone" />

<!-- Angular Material -->
<mat-form-field>
  <mat-label>Phone</mat-label>
  <tel-country-select matPrefix [for]="phone" />
  <input matInput telInput #phone="telInput" formControlName="phone" />
</mat-form-field>
```

| `telInput` input     | Default                   | Meaning                                                  |
| -------------------- | ------------------------- | -------------------------------------------------------- |
| `defaultCountry`     | region of `LOCALE_ID`     | Where a national number is read until a country is picked. ISO code, either case. |

| `tel-country-select` input | Default | Meaning                                         |
| -------------------------- | ------- | ----------------------------------------------- |
| `for`                      | (required) | The `telInput` it belongs to.                 |
| `preferredCountries`       | `[]`    | Listed first, in this order.                    |
| `label`                    | `'Country'` | Accessible name of the list.                |

App-wide defaults: `provideTelInput({ defaultCountry: 'de', preferredCountries: ['de', 'at', 'ch'] })`.

## What it does with values

| Typed (default country `DE`) | Control            |
| ---------------------------- | ------------------ |
| `030 1234567`                | `+49 30 1234567`   |
| `0043 1 5134433`             | `+43 1 5134433` (and Austria is selected) |
| `call me`                    | `call me` (as typed, and `invalidNumber`) |
| nothing                      | `''`               |

**Writing** a value never changes it. A number with a calling code selects its country and is shown
nationally. A number stored without one (`0301234567`) stays as stored until the user edits it,
and is shown and validated in the selected country.

**Picking a country** re-reads the typed national number in that country.

**On blur** a readable number is shown in its tidy national form.

Edits that keep the same number are not reported, so they do not mark the control dirty.

## Coming from ngx-material-intl-tel-input

`[fieldControl]="form.controls.phone"` becomes a normal `formControlName` / `[formControl]` on
the input, `preferredCountries` and `autoSelectedCountry` become `preferredCountries` and
`defaultCountry`. The value keeps its international format. The validator's error keys
(`invalidNumber`, `numberTooLong`) are the same. Labels, hints and errors belong to your form
field now, not to the component.

## License

MIT
