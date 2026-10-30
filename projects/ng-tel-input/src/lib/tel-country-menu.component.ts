import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';

import { injectTelInputOptions } from './tel-input-config';
import { TelCountry, listCountries, searchCountries } from './tel-format';
import { TelInputDirective } from './tel-input.directive';

/** Numbers the menus on a page, for the ids that tie the search field to its list. */
let nextId = 0;

/**
 * The browser has the Popover API. Only then does the list get `popover`: an environment that
 * styles `[popover]` without the API (jsdom) would otherwise keep it hidden for good.
 */
const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/**
 * The searchable country picker of a `telInput`: the selected country's flag and calling code,
 * and on click a list of every country with a search field on top, the preferred ones first.
 *
 * The search finds a country by its name (accents and case aside), its calling code or its ISO
 * code. Keyboard: arrows, Page Up/Down, Enter and Esc in the search field; arrows on the closed
 * picker open it. It follows the ARIA combobox pattern, so screen readers announce the country
 * under the cursor. Choosing one puts the focus in the phone field.
 *
 * The list opens in the browser's top layer where the Popover API exists, so a form field's
 * `overflow: hidden` or a dialog cannot clip it. Its colors come from Angular Material's system
 * variables when the page has them, else from the browser's (`Canvas`), so it matches either.
 *
 * Country names come from `Intl.DisplayNames` in `LOCALE_ID`. Inside an Angular Material form
 * field, put it in the `matPrefix` slot. For the lightest picker, use `tel-country-select`.
 */
@Component({
  selector: 'tel-country-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tel-country-menu',
    '[class.tel-country-menu--open]': 'open()'
  },
  template: `
    <button
      #trigger
      type="button"
      class="tel-country-menu__trigger"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-label]="triggerLabel()"
      [disabled]="for().disabled()"
      (click)="toggle($event)"
      (keydown)="onTriggerKey($event)"
    >
      @if (selected(); as country) {
        <span class="tel-country-menu__flag" aria-hidden="true">{{ country.flag }}</span>
        <span class="tel-country-menu__dial" aria-hidden="true">+{{ country.dialCode }}</span>
      }
      <span class="tel-country-menu__arrow" aria-hidden="true"></span>
    </button>
    <div
      #panel
      class="tel-country-menu__panel"
      [attr.popover]="popover ? 'manual' : null"
      hidden
      (click)="$event.stopPropagation()"
      (keydown)="onPanelKey($event)"
    >
      <input
        #search
        class="tel-country-menu__search"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-expanded="true"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeId()"
        [attr.aria-label]="searchLabel()"
        [placeholder]="searchLabel()"
        [value]="query()"
        (input)="filter(search.value)"
      />
      <ul #list class="tel-country-menu__list" role="listbox" [id]="listId" [attr.aria-label]="label()">
        @for (country of shown(); track country.code; let i = $index) {
          @if (i === dividerAt()) {
            <li class="tel-country-menu__divider" role="presentation"></li>
          }
          <li
            role="option"
            class="tel-country-menu__option"
            [id]="listId + '-' + country.code"
            [attr.aria-selected]="country.code === for().country()"
            [class.tel-country-menu__option--active]="i === active()"
            (pointermove)="active.set(i)"
            (click)="choose(country)"
          >
            <span class="tel-country-menu__flag" aria-hidden="true">{{ country.flag }}</span>
            <span class="tel-country-menu__name">{{ country.name }}</span>
            <span class="tel-country-menu__dial">+{{ country.dialCode }}</span>
          </li>
        } @empty {
          <li class="tel-country-menu__empty" role="presentation">{{ noResultsLabel() }}</li>
        }
      </ul>
    </div>
  `,
  styles: `
    /* Own line height: Material's matPrefix slot is built for icons and sets line-height: 0. */
    :host {
      position: relative;
      display: inline-flex;
      align-items: center;
      line-height: normal;
      white-space: nowrap;
    }
    .tel-country-menu__trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .tel-country-menu__trigger:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
      border-radius: 2px;
    }
    .tel-country-menu__trigger:disabled {
      cursor: default;
      opacity: 0.6;
    }
    .tel-country-menu__arrow {
      width: 0;
      height: 0;
      margin-left: 0.15em;
      border: 0.3em solid transparent;
      border-top-color: currentColor;
      border-bottom: 0;
      opacity: 0.6;
      transition: transform 150ms ease;
    }
    :host(.tel-country-menu--open) .tel-country-menu__arrow {
      transform: rotate(180deg);
    }
    /* Placed by place(); position: fixed both in the top layer and without the Popover API. */
    .tel-country-menu__panel {
      position: fixed;
      inset: auto;
      z-index: 1000;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      max-height: min(360px, 60vh);
      margin: 0;
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: var(--tel-menu-radius, var(--mat-sys-corner-small, 8px));
      background: var(--tel-menu-background, var(--mat-sys-surface-container, Canvas));
      color: var(--tel-menu-color, var(--mat-sys-on-surface, CanvasText));
      box-shadow: var(--tel-menu-shadow, var(--mat-sys-level2, 0 4px 16px rgb(0 0 0 / 0.2)));
      font: inherit;
      font-size: 15px;
      white-space: normal;
      text-align: start;
    }
    .tel-country-menu__panel[hidden] {
      display: none;
    }
    .tel-country-menu__search {
      margin: 8px;
      padding: 9px 12px;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      outline: none;
    }
    .tel-country-menu__search:focus {
      border-color: var(--tel-menu-accent, var(--mat-sys-primary, Highlight));
    }
    .tel-country-menu__list {
      margin: 0;
      padding: 0 0 8px;
      overflow-y: auto;
      list-style: none;
    }
    .tel-country-menu__option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 16px;
      cursor: pointer;
    }
    .tel-country-menu__option--active {
      background: color-mix(in srgb, currentColor 8%, transparent);
    }
    .tel-country-menu__option[aria-selected='true'] {
      font-weight: 600;
    }
    .tel-country-menu__option[aria-selected='true']::after {
      content: '✓';
      color: var(--tel-menu-accent, var(--mat-sys-primary, Highlight));
    }
    .tel-country-menu__name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tel-country-menu__option .tel-country-menu__dial {
      opacity: 0.65;
      font-variant-numeric: tabular-nums;
    }
    .tel-country-menu__divider {
      height: 1px;
      margin: 4px 0;
      background: color-mix(in srgb, currentColor 15%, transparent);
    }
    .tel-country-menu__empty {
      padding: 12px 16px;
      opacity: 0.65;
    }
    @media (prefers-reduced-motion: reduce) {
      .tel-country-menu__arrow {
        transition: none;
      }
    }
  `
})
export class TelCountryMenuComponent implements OnDestroy {
  /** The phone field this picker belongs to. */
  readonly for = input.required<TelInputDirective>();
  /** Countries listed first, in this order; ISO codes in either case. */
  readonly preferredCountries = input<readonly string[]>();
  /** Accessible name of the picker and its list; the visible part is only a flag and a code. */
  readonly label = input('Country');
  /** Placeholder and accessible name of the search field. */
  readonly searchLabel = input('Search');
  /** Shown when the search finds no country. */
  readonly noResultsLabel = input('No country found');

  /** The list goes to the top layer, see {@link POPOVER}. */
  protected readonly popover = POPOVER;
  /** Ties the search field to its list (`aria-controls`, `aria-activedescendant`). */
  protected readonly listId = `tel-country-menu-${nextId++}`;
  /** The list is open. */
  protected readonly open = signal(false);
  /** What the search field holds. */
  protected readonly query = signal('');
  /** Index in {@link shown} of the country under the cursor; Enter chooses it. */
  protected readonly active = signal(-1);

  /** What {@link provideTelInput} and `LOCALE_ID` set, read once. */
  private readonly options = injectTelInputOptions();
  /** The list, built once per `preferredCountries`. */
  private readonly countries = computed(() =>
    listCountries(this.options.locale, this.preferredCountries() ?? this.options.preferredCountries ?? [])
  );
  /** The selected country's entry, for the trigger. */
  protected readonly selected = computed(() => {
    const code = this.for().country();
    const { preferred, others } = this.countries();
    return preferred.find(country => country.code === code) ?? others.find(country => country.code === code);
  });
  /** What a screen reader says for the closed picker: `Country: Germany +49`. */
  protected readonly triggerLabel = computed(() => {
    const country = this.selected();
    return country ? `${this.label()}: ${country.name} +${country.dialCode}` : this.label();
  });
  /** The countries the search finds; all of them, preferred first, without one. */
  protected readonly shown = computed(() => {
    const { preferred, others } = this.countries();
    return searchCountries([...preferred, ...others], this.query());
  });
  /** Where the line between the preferred countries and the rest goes; `-1` for none. */
  protected readonly dividerAt = computed(() => {
    const { preferred, others } = this.countries();
    return !this.query().trim() && preferred.length && others.length ? preferred.length : -1;
  });
  /** The id of the option under the cursor, for `aria-activedescendant`. */
  protected readonly activeId = computed(() => {
    const country = this.shown()[this.active()];
    return country ? `${this.listId}-${country.code}` : null;
  });

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  /**
   * Opens the list, or closes it and gives the focus back to the trigger. The click goes no
   * further: an Angular Material form field moves the focus to its input on any click inside it,
   * which would take it from the search field. The list stops its clicks for the same reason.
   */
  protected toggle(event?: Event): void {
    event?.stopPropagation();
    if (this.open()) {
      this.close(true);
    } else {
      this.show();
    }
  }

  /** The closed picker: the arrow keys open it, as they do a native select. */
  protected onTriggerKey(event: KeyboardEvent): void {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !this.open()) {
      event.preventDefault();
      this.show();
    }
  }

  /** The keys of the open list, whose focus stays in the search field. */
  protected onPanelKey(event: KeyboardEvent): void {
    const last = this.shown().length - 1;
    const moves: Partial<Record<string, number>> = {
      ArrowDown: this.active() + 1,
      ArrowUp: this.active() - 1,
      PageDown: this.active() + 10,
      PageUp: this.active() - 10
    };
    const to = moves[event.key];
    if (to !== undefined) {
      event.preventDefault();
      this.active.set(Math.max(0, Math.min(last, to)));
      this.reveal();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const country = this.shown()[this.active()];
      if (country) {
        this.choose(country);
      }
    } else if (event.key === 'Escape') {
      // Only the list closes, not a dialog the field sits in.
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
    } else if (event.key === 'Tab') {
      this.close(false);
    }
  }

  /** The search field changed: the first match is under the cursor. */
  protected filter(text: string): void {
    this.query.set(text);
    this.active.set(text.trim() ? 0 : this.selectedIndex());
    this.reveal();
  }

  /** Hands the country to the phone field, closes the list and puts the focus in the field. */
  protected choose(country: TelCountry): void {
    this.for().selectCountry(country.code);
    this.close(false);
    this.for().focus();
  }

  ngOnDestroy(): void {
    this.unlisten();
  }

  /** Opens the list below the trigger (above it when there is no room), the selected country in view. */
  private show(): void {
    if (this.for().disabled()) {
      return;
    }
    this.query.set('');
    this.active.set(this.selectedIndex());
    this.open.set(true);
    const panel = this.panel().nativeElement;
    panel.hidden = false;
    if (POPOVER) {
      panel.showPopover();
    }
    this.place();
    this.search().nativeElement.value = '';
    this.search().nativeElement.focus();
    this.reveal();
    this.document.addEventListener('pointerdown', this.outside, true);
    this.document.addEventListener('scroll', this.place, true);
    this.document.defaultView?.addEventListener('resize', this.place);
  }

  /** Closes the list; with `refocus`, the focus goes back to the trigger. */
  private close(refocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    const panel = this.panel().nativeElement;
    if (POPOVER && panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    panel.hidden = true;
    this.unlisten();
    if (refocus) {
      this.trigger().nativeElement.focus();
    }
  }

  /** A press outside the picker and its list closes the list, and leaves the focus where it went. */
  private readonly outside = (event: Event): void => {
    if (!this.host.contains(event.target as Node)) {
      this.close(false);
    }
  };

  /**
   * Puts the open list under the trigger, or above it when there is more room there, and makes it
   * no taller than that room, so it never covers the field.
   */
  private readonly place = (): void => {
    const view = this.document.defaultView;
    if (!view || !this.open()) {
      return;
    }
    const panel = this.panel().nativeElement;
    const anchor = this.trigger().nativeElement.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(320, view.innerWidth - 2 * gap);
    const left = Math.max(gap, Math.min(anchor.left - gap, view.innerWidth - width - gap));
    const below = view.innerHeight - anchor.bottom - 2 * gap;
    const above = anchor.top - 2 * gap;
    const down = below >= Math.min(360, panel.scrollHeight) || below >= above;
    const room = Math.max(120, down ? below : above);
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${Math.min(360, room)}px`;
    panel.style.top = down ? `${anchor.bottom + gap}px` : '';
    panel.style.bottom = down ? '' : `${view.innerHeight - anchor.top + gap}px`;
  };

  /** Scrolls the option under the cursor into view, once the list shows the current search. */
  private reveal(): void {
    afterNextRender(
      () => {
        const id = this.activeId();
        const option = id ? this.list().nativeElement.querySelector<HTMLElement>(`#${id}`) : null;
        option?.scrollIntoView?.({ block: 'nearest' });
      },
      { injector: this.injector }
    );
  }

  /** Where the selected country is in the full list; the top when it is not there. */
  private selectedIndex(): number {
    return Math.max(0, this.shown().findIndex(country => country.code === this.for().country()));
  }

  private unlisten(): void {
    this.document.removeEventListener('pointerdown', this.outside, true);
    this.document.removeEventListener('scroll', this.place, true);
    this.document.defaultView?.removeEventListener('resize', this.place);
  }
}
