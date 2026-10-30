import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TelInputDirective } from './tel-input.directive';

/**
 * A phone icon at the end of a `telInput` that dials the number (`tel:`) once it is a valid one;
 * until then it is only an icon: a link without `href`, so out of the tab order, and hidden from
 * screen readers.
 *
 * Inside an Angular Material form field, put it in the `matSuffix` slot.
 */
@Component({
  selector: 'tel-call-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tel-call-link' },
  template: `
    <a
      class="tel-call-link__icon"
      [class.tel-call-link__icon--off]="!number()"
      [attr.href]="number() ? 'tel:' + number() : null"
      [attr.aria-label]="number() ? label() + ' ' + number() : null"
      [attr.aria-hidden]="number() ? null : 'true'"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path
          d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"
        />
      </svg>
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      line-height: normal;
    }
    .tel-call-link__icon {
      display: inline-flex;
      padding: 4px;
      border-radius: 50%;
      color: var(--tel-call-color, var(--mat-sys-primary, LinkText));
    }
    .tel-call-link__icon:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 1px;
    }
    .tel-call-link__icon--off {
      color: inherit;
      opacity: 0.45;
    }
  `
})
export class TelCallLinkComponent {
  /** The phone field whose number it dials. */
  readonly for = input.required<TelInputDirective>();
  /** Read before the number by screen readers: `Call +49301234567`. */
  readonly label = input('Call');

  /** The number to dial, while it is a valid one. */
  protected readonly number = computed(() => this.for().e164());
}
