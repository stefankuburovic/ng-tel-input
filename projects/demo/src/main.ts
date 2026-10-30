import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  TelCallLinkComponent,
  TelCountryMenuComponent,
  TelCountrySelectComponent,
  TelInputDirective,
  provideTelInput
} from '@stefankuburovic/ng-tel-input';
import examples from 'libphonenumber-js/mobile/examples';
import { JsonPipe, registerLocaleData } from '@angular/common';
import de from '@angular/common/locales/de';

registerLocaleData(de);

/** The playground: the field in Material fill and outline, and without Material. */
@Component({
  selector: 'demo-root',
  imports: [
    ReactiveFormsModule,
    JsonPipe,
    MatFormField,
    MatLabel,
    MatHint,
    MatPrefix,
    MatSuffix,
    MatError,
    MatInput,
    TelInputDirective,
    TelCountrySelectComponent,
    TelCountryMenuComponent,
    TelCallLinkComponent
  ],
  template: `
    <main>
      <h1>ng-tel-input</h1>

      <h2>Searchable menu</h2>
      <mat-form-field>
        <mat-label>Telefonnummer</mat-label>
        <tel-country-menu matPrefix [for]="m" label="Land" searchLabel="Suchen" noResultsLabel="Kein Land gefunden" />
        <input matInput telInput #m="telInput" [formControl]="menu" />
        <tel-call-link matSuffix [for]="m" label="Anrufen" />
        <mat-hint>Land wählen und Nummer eingeben</mat-hint>
        <mat-error>Bitte eine gültige Telefonnummer eingeben.</mat-error>
      </mat-form-field>
      <pre>value: {{ menu.value | json }} · errors: {{ menu.errors | json }}</pre>

      <mat-form-field appearance="outline">
        <mat-label>Outline</mat-label>
        <tel-country-menu matPrefix [for]="o" />
        <input matInput telInput #o="telInput" [formControl]="menuOutline" />
        <tel-call-link matSuffix [for]="o" />
      </mat-form-field>

      <div class="plain">
        <tel-country-menu [for]="p" />
        <input telInput #p="telInput" [formControl]="menuPlain" />
        <tel-call-link [for]="p" />
      </div>
      <pre>value: {{ menuPlain.value | json }}</pre>

      <h2>Native select</h2>
      <mat-form-field>
        <mat-label>Festnetz</mat-label>
        <tel-country-select matPrefix [for]="a" [preferredCountries]="['de', 'at', 'ch']" label="Land" />
        <input matInput telInput #a="telInput" defaultCountry="de" [formControl]="landline" />
        <mat-error>Bitte eine gültige Telefonnummer eingeben.</mat-error>
      </mat-form-field>
      <pre>value: {{ landline.value | json }} · errors: {{ landline.errors | json }}</pre>

      <mat-form-field>
        <tel-country-select matPrefix [for]="b" [preferredCountries]="['de', 'at', 'ch']" label="Land" />
        <input matInput telInput #b="telInput" defaultCountry="de" [formControl]="mobile" />
      </mat-form-field>
      <pre>value: {{ mobile.value | json }}</pre>

      <mat-form-field appearance="outline">
        <mat-label>Outline</mat-label>
        <tel-country-select matPrefix [for]="c" />
        <input matInput telInput #c="telInput" [formControl]="outline" />
      </mat-form-field>

      <div class="plain">
        <tel-country-select [for]="d" [preferredCountries]="['de', 'at', 'ch']" />
        <input telInput #d="telInput" placeholder="Mobilnummer" [formControl]="plain" />
      </div>
      <pre>value: {{ plain.value | json }}</pre>
    </main>
  `
})
class App {
  readonly landline = new FormControl('', Validators.required);
  readonly mobile = new FormControl('+41 44 668 18 00');
  readonly outline = new FormControl('');
  readonly plain = new FormControl('');
  readonly menu = new FormControl('', Validators.required);
  readonly menuOutline = new FormControl('');
  readonly menuPlain = new FormControl('');
}

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'de-DE' },
    // Example numbers as placeholders, and the countries at the top of every picker.
    provideTelInput({ preferredCountries: ['de', 'at', 'ch'], examples })
  ]
}).catch(error => console.error(error));
