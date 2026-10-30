import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Examples } from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

import { TelCallLinkComponent } from './tel-call-link.component';
import { TelCountryMenuComponent } from './tel-country-menu.component';
import { TelInputDirective } from './tel-input.directive';
import { searchCountries, listCountries } from './tel-format';

/** The menu, a field and a call link, wired the way the README shows; and a field with its own placeholder. */
@Component({
  template: `
    <div (click)="containerClicks = containerClicks + 1">
      <tel-country-menu
        [for]="phone"
        [preferredCountries]="['de', 'at', 'ch']"
        label="Land"
        searchLabel="Suchen"
        noResultsLabel="Kein Land"
      />
    </div>
    <input telInput #phone="telInput" defaultCountry="de" [examples]="examples()" [formControl]="control" />
    <tel-call-link [for]="phone" label="Anrufen" />
    <input telInput class="own" placeholder="Nummer" defaultCountry="de" [examples]="examples()" [formControl]="other" />
  `,
  imports: [ReactiveFormsModule, TelInputDirective, TelCountryMenuComponent, TelCallLinkComponent]
})
class Host {
  readonly control = new FormControl<string | null>(null);
  readonly other = new FormControl<string | null>(null);
  readonly examples = signal<Examples | undefined>(undefined);
  /** Clicks that reached the element around the menu, as a Material form field's would. */
  containerClicks = 0;
}

describe('tel-country-menu', () => {
  /** Builds the host under `de-DE`. */
  const build = () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const q = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      trigger: q<HTMLButtonElement>('.tel-country-menu__trigger'),
      panel: q<HTMLElement>('.tel-country-menu__panel'),
      search: q<HTMLInputElement>('.tel-country-menu__search'),
      field: q<HTMLInputElement>('input[telInput]'),
      link: q<HTMLAnchorElement>('.tel-call-link__icon'),
      render: () => fixture.detectChanges()
    };
  };

  /** The codes of the listed options, in order. */
  const listed = (root: HTMLElement): string[] =>
    Array.from(root.querySelectorAll('[role="option"]')).map(option => option.id.split('-').pop()!);

  const key = (target: Element, name: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  };

  const type = (input: HTMLInputElement, text: string): void => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  describe('closed', () => {
    it('shows the flag and calling code, and names the country for screen readers', () => {
      const { trigger, panel } = build();
      expect(trigger.textContent).toContain('🇩🇪');
      expect(trigger.textContent).toContain('+49');
      expect(trigger.getAttribute('aria-label')).toBe('Land: Deutschland +49');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(panel.hidden).toBe(true);
    });

    it('follows the disabled state of the control and does not open then', () => {
      const { host, trigger, panel, render } = build();
      host.control.disable();
      render();
      expect(trigger.disabled).toBe(true);
      trigger.click();
      expect(panel.hidden).toBe(true);
    });
  });

  describe('open', () => {
    it('lists the preferred countries first, after them a line, with the selected one under the cursor', () => {
      const { root, trigger, panel, search, render } = build();
      trigger.click();
      render();

      expect(panel.hidden).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(search);
      expect(listed(root).slice(0, 3)).toEqual(['DE', 'AT', 'CH']);
      expect(root.querySelectorAll('[role="option"]')[3].previousElementSibling?.classList).toContain(
        'tel-country-menu__divider'
      );
      expect(root.querySelector('[aria-selected="true"]')?.id).toMatch(/-DE$/);
      expect(search.getAttribute('aria-activedescendant')).toMatch(/-DE$/);
      expect(search.placeholder).toBe('Suchen');
    });

    it('finds a country by its name without accents, by calling code and by ISO code', () => {
      const { root, trigger, search, render } = build();
      trigger.click();
      render();

      type(search, 'osterreich');
      render();
      expect(listed(root)).toEqual(['AT']);
      expect(root.querySelector('.tel-country-menu__divider'), 'no line while searching').toBeNull();

      type(search, '+43');
      render();
      expect(listed(root)).toEqual(['AT']);

      type(search, 'hu');
      render();
      expect(listed(root)).toContain('HU');

      type(search, 'zzzz');
      render();
      expect(listed(root)).toEqual([]);
      expect(root.querySelector('.tel-country-menu__empty')?.textContent?.trim()).toBe('Kein Land');
    });

    it('chooses with the keyboard, re-reads the number and puts the focus in the field', () => {
      const { host, root, trigger, search, field, panel, render } = build();
      type(field, '01 5134433');
      key(trigger, 'ArrowDown');
      render();
      expect(panel.hidden).toBe(false);

      type(search, 'öster');
      render();
      key(search, 'Enter');
      render();

      expect(host.control.value).toBe('+43 1 5134433');
      expect(panel.hidden).toBe(true);
      expect(document.activeElement).toBe(field);
      expect(trigger.getAttribute('aria-label')).toBe('Land: Österreich +43');
      expect(root.textContent).toContain('+43');
    });

    it('moves the cursor with the arrow keys', () => {
      const { trigger, search, render } = build();
      trigger.click();
      render();
      key(search, 'ArrowDown');
      render();
      expect(search.getAttribute('aria-activedescendant')).toMatch(/-AT$/);
      key(search, 'ArrowUp');
      key(search, 'ArrowUp');
      render();
      expect(search.getAttribute('aria-activedescendant'), 'stops at the top').toMatch(/-DE$/);
    });

    it('closes on Esc with the focus back on the trigger, and on a press outside', () => {
      const { trigger, search, panel, render } = build();
      trigger.click();
      render();
      key(search, 'Escape');
      render();
      expect(panel.hidden).toBe(true);
      expect(document.activeElement).toBe(trigger);

      trigger.click();
      render();
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      render();
      expect(panel.hidden).toBe(true);
    });

    it('keeps its clicks from the field around it, which would move the focus to the input', () => {
      const { host, trigger, search, render } = build();
      trigger.click();
      render();
      search.click();
      expect(host.containerClicks).toBe(0);
      expect(document.activeElement).toBe(search);
    });

    it('chooses with a click', () => {
      const { host, root, trigger, field, render } = build();
      type(field, '044 668 18 00');
      trigger.click();
      render();
      root.querySelector<HTMLElement>(`[role="option"][id$="-CH"]`)!.click();
      render();
      expect(host.control.value).toBe('+41 44 668 18 00');
    });
  });
});

describe('tel-call-link', () => {
  it('dials the number once it is valid, and is only an icon before', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const link = root.querySelector<HTMLAnchorElement>('.tel-call-link__icon')!;
    const field = root.querySelector<HTMLInputElement>('input[telInput]')!;

    expect(link.hasAttribute('href')).toBe(false);
    expect(link.getAttribute('aria-hidden')).toBe('true');

    field.value = '030 1234567';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(link.getAttribute('href')).toBe('tel:+49301234567');
    expect(link.getAttribute('aria-label')).toBe('Anrufen +49301234567');
    expect(link.hasAttribute('aria-hidden')).toBe(false);

    field.value = '030';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(link.hasAttribute('href')).toBe(false);
  });
});

describe('example placeholder', () => {
  it('shows the selected country’s example number, but never over a placeholder of its own', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const field = root.querySelector<HTMLInputElement>('input[telInput]')!;
    const own = root.querySelector<HTMLInputElement>('input.own')!;
    expect(field.placeholder, 'none without examples').toBe('');

    fixture.componentInstance.examples.set(examples);
    fixture.detectChanges();
    expect(field.placeholder).toBe('01512 3456789');
    expect(own.placeholder).toBe('Nummer');

    field.value = '+43 1 5134433';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(field.placeholder).toBe('0664 123456');
  });
});

describe('searchCountries', () => {
  it('puts the names that start with the query first', () => {
    const all = listCountries('en', []).others;
    const found = searchCountries(all, 'ger').map(country => country.name);
    expect(found[0]).toBe('Germany');
    expect(found).toEqual(expect.arrayContaining(['Algeria', 'Nigeria']));
  });
});
