# @stefankuburovic/ng-tel-input

A phone number input for Angular forms, built on
[libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js).

- The form control holds the number in **international format** (`+49 30 1234567`), and the field
  shows it **nationally** (`030 1234567`) next to the country's flag and calling code.
- A number typed with its calling code (`+43…` or `0043…`) selects its own country.
- Two country pickers: the browser's own `<select>` (`tel-country-select`), and a searchable
  menu (`tel-country-menu`) with flags, calling codes and the preferred countries on top. Names
  come from `Intl.DisplayNames` in your `LOCALE_ID`, so nothing is shipped for them.
- An example number of the selected country as the placeholder, and a phone icon that dials a
  valid number (`tel-call-link`), both optional.
- A validator is built in (`invalidNumber`, `numberTooLong`).
- Signals, zoneless, standalone. Angular Material is optional: pickers go in `matPrefix`, the
  call icon in `matSuffix`.
- **2.8 kB** min+gzip with the native picker, **6.4 kB** with everything, plus libphonenumber-js
  (about 29 kB with its default metadata), against roughly 116 kB for google-libphonenumber alone.
  What you do not import is left out of your build.

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
| `examples`           | none                      | Example numbers for the placeholder, see below. |

### Searchable menu

`tel-country-menu` takes the place of `tel-country-select` where a list of 240 countries needs a
search field, the way ngx-material-intl-tel-input looks:

```html
<mat-form-field>
  <mat-label>Phone</mat-label>
  <tel-country-menu matPrefix [for]="phone" />
  <input matInput telInput #phone="telInput" formControlName="phone" />
  <tel-call-link matSuffix [for]="phone" />
  <mat-hint>Pick a country and type the number</mat-hint>
</mat-form-field>
```

- The search finds a country by its name, accents and case aside (`osterreich` finds Österreich),
  by calling code (`+43`, `43`) or by ISO code.
- Keyboard: the arrow keys open it; in the search field the arrows, Page Up/Down, Enter and Esc.
  It follows the ARIA combobox pattern, so screen readers read the country under the cursor.
  Choosing one puts the focus in the phone field.
- The list opens in the browser's top layer (Popover API), so a form field's `overflow` or a
  dialog cannot clip it, below the picker or above it when there is more room there.
- Its colors come from Angular Material's `--mat-sys-*` variables when the page has them, else
  from the browser's (`Canvas`, `CanvasText`). Your own: `--tel-menu-background`,
  `--tel-menu-color`, `--tel-menu-accent`, `--tel-menu-radius`, `--tel-menu-shadow`.

| `tel-country-menu` input | Default | Meaning |
| --- | --- | --- |
| `for` | (required) | The `telInput` it belongs to. |
| `preferredCountries` | `[]` | Listed first, in this order, above a line. |
| `label` | `'Country'` | Accessible name of the picker and its list. |
| `searchLabel` | `'Search'` | Placeholder and accessible name of the search field. |
| `noResultsLabel` | `'No country found'` | Shown when the search finds nothing. |

### Call icon and example number

`tel-call-link` is a phone icon that turns into a `tel:` link once the number is valid (`label`,
default `'Call'`, is read before the number). Its color: `--tel-call-color`.

For an example number as the placeholder, hand the field libphonenumber-js's examples (about
1.4 kB gzipped), app-wide or per field; a field with a placeholder of its own keeps it:

```ts
import examples from 'libphonenumber-js/mobile/examples';

provideTelInput({ examples })
```

| `tel-country-select` input | Default | Meaning                                         |
| -------------------------- | ------- | ----------------------------------------------- |
| `for`                      | (required) | The `telInput` it belongs to.                 |
| `preferredCountries`       | `[]`    | Listed first, in this order.                    |
| `label`                    | `'Country'` | Accessible name of the list.                |

App-wide defaults: `provideTelInput({ defaultCountry: 'de', preferredCountries: ['de', 'at', 'ch'], examples })`.

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
field now, not to the component. For the same look, use `tel-country-menu` in `matPrefix` and
`tel-call-link` in `matSuffix`; `useMask` and `autoIpLookup` have no counterpart.

## License

MIT
