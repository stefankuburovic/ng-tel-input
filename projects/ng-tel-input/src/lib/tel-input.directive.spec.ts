import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TelCountrySelectComponent } from './tel-country-select.component';
import { provideTelInput } from './tel-input-config';
import { TelInputDirective } from './tel-input.directive';
import { listCountries, localeCountry, telErrors, telValue, toCountryCode } from './tel-format';

/** A picker and a field, wired the way the README shows. */
@Component({
  template: `
    <tel-country-select [for]="phone" [preferredCountries]="preferred()" label="Land" />
    <input telInput #phone="telInput" [defaultCountry]="country()" [formControl]="control" />
  `,
  imports: [ReactiveFormsModule, TelInputDirective, TelCountrySelectComponent]
})
class Host {
  readonly control = new FormControl<string | null>(null);
  readonly country = signal<string | undefined>('de');
  readonly preferred = signal<string[]>(['de', 'at', 'ch']);
}

describe('ng-tel-input', () => {
  /** Builds the host under `de-DE`. */
  const build = (setup: (host: Host) => void = () => undefined, providers: unknown[] = []) => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }, ...(providers as [])] });
    const fixture = TestBed.createComponent(Host);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    const element: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    return { fixture, host: fixture.componentInstance, element, select };
  };

  /** Types `text` as the whole content of the field. */
  const type = (element: HTMLInputElement, text: string): void => {
    element.value = text;
    element.dispatchEvent(new Event('input'));
  };

  describe('the value', () => {
    it('is the international format of a national number', () => {
      const { host, element } = build();
      type(element, '030 1234567');
      expect(host.control.value).toBe('+49 30 1234567');
      expect(host.control.valid).toBe(true);
    });

    it('takes +, 00 and a country of its own, and the picker follows', () => {
      const { fixture, host, element, select } = build();
      type(element, '0043 1 5134433');
      expect(host.control.value).toBe('+43 1 5134433');
      fixture.detectChanges();
      expect(select.value).toBe('AT');
      expect(fixture.nativeElement.textContent).toContain('+43');
    });

    it('is the text as typed when it cannot be read, and empty for an empty field', () => {
      const { host, element } = build();
      type(element, 'call me');
      expect(host.control.value).toBe('call me');
      type(element, '');
      expect(host.control.value).toBe('');
    });

    it('is not reported for an edit that keeps the number', () => {
      const { host, element } = build();
      type(element, '030 1234567');
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe(value => changes.push(value));
      type(element, '0301234567');
      expect(changes).toEqual([]);
    });
  });

  describe('writing a value', () => {
    it('shows a number of the selected country nationally and leaves the model alone', () => {
      const { fixture, host, element } = build();
      host.control.setValue('+49 30 1234567');
      fixture.detectChanges();
      expect(element.value).toBe('030 1234567');
      expect(host.control.value).toBe('+49 30 1234567');
      expect(host.control.dirty).toBe(false);
    });

    it('selects the country of a foreign number', () => {
      const { fixture, host, element, select } = build();
      host.control.setValue('+41 44 668 18 00');
      fixture.detectChanges();
      expect(element.value).toBe('044 668 18 00');
      expect(select.value).toBe('CH');
    });

    it('keeps a number stored nationally as stored, and still validates it in the default country', () => {
      const { fixture, host, element } = build();
      host.control.setValue('0301234567');
      fixture.detectChanges();
      expect(element.value).toBe('030 1234567');
      expect(host.control.value).toBe('0301234567');
      expect(host.control.valid).toBe(true);
    });

    it('shows null and unreadable text as they are', () => {
      const { fixture, host, element } = build();
      host.control.setValue('n/a');
      fixture.detectChanges();
      expect(element.value).toBe('n/a');
      host.control.setValue(null);
      fixture.detectChanges();
      expect(element.value).toBe('');
    });
  });

  describe('picking a country', () => {
    it('re-reads the typed national number in the new country', () => {
      const { fixture, host, element, select } = build();
      type(element, '01 5134433');
      select.value = 'AT';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(host.control.value).toBe('+43 1 5134433');
      expect(fixture.nativeElement.textContent).toContain('+43');
    });

    it('lists the preferred countries first, then all by their German name', () => {
      const { select } = build();
      const options = Array.from(select.options);
      expect(options.slice(0, 3).map(option => option.value)).toEqual(['DE', 'AT', 'CH']);
      expect(options[3].disabled).toBe(true);
      expect(options.find(option => option.value === 'HU')?.textContent?.trim()).toBe('Ungarn +36');
      expect(select.getAttribute('aria-label')).toBe('Land');
    });

    it('follows the disabled state of the control', () => {
      const { fixture, host, element, select } = build();
      host.control.disable();
      fixture.detectChanges();
      expect(element.disabled).toBe(true);
      expect(select.disabled).toBe(true);
    });
  });

  describe('validation', () => {
    it('flags an invalid number, but not an empty field', () => {
      const { host, element } = build();
      type(element, '030');
      expect(host.control.errors).toEqual({ invalidNumber: true });
      type(element, '');
      expect(host.control.errors).toBeNull();
    });

    it('works next to required', () => {
      const { host } = build(h => h.control.addValidators(Validators.required));
      host.control.updateValueAndValidity();
      expect(host.control.errors).toEqual({ required: true });
    });

    it('reports too many digits as numberTooLong', () => {
      expect(telErrors('+49 30 1234567890123456789', 'DE')).toEqual({ numberTooLong: true });
    });
  });

  describe('defaults', () => {
    it('reads the default country from provideTelInput, then LOCALE_ID', () => {
      const { host, element } = build(h => h.country.set(undefined), [provideTelInput({ defaultCountry: 'at' })]);
      type(element, '01 5134433');
      expect(host.control.value).toBe('+43 1 5134433');
      expect(localeCountry('de-CH')).toBe('CH');
      expect(localeCountry('xx')).toBeUndefined();
    });
  });

  describe('helpers', () => {
    it('normalise ISO codes and drop unknown ones', () => {
      expect(toCountryCode(' de ')).toBe('DE');
      expect(toCountryCode('zz')).toBeUndefined();
      expect(toCountryCode(null)).toBeUndefined();
    });

    it('build a flag from the code', () => {
      expect(listCountries('en', ['de']).preferred[0]).toEqual({ code: 'DE', dialCode: '49', name: 'Germany', flag: '🇩🇪' });
    });

    it('format a value', () => {
      expect(telValue('  ', 'DE')).toBe('');
      expect(telValue('+1 212 555 0100', 'DE')).toBe('+1 212 555 0100');
    });
  });
});
