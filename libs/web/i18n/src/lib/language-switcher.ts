import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageSelect } from '@boilerplate/web-ui';
import { LANGUAGES, saveLanguage } from './i18n';

/** Connects the language select to Transloco. */
@Component({
  selector: 'app-language-switcher',
  imports: [LanguageSelect, TranslocoPipe],
  template: `
    <app-language-select
      [languages]="languages"
      [active]="active()"
      [label]="'app.language' | transloco"
      (changed)="select($event)"
    />
  `,
})
export class LanguageSwitcher {
  private readonly transloco = inject(TranslocoService);
  protected readonly languages = LANGUAGES;
  protected readonly active = toSignal(this.transloco.langChanges$);

  protected select(language: string): void {
    this.transloco.setActiveLang(language);
    saveLanguage(language);
  }
}
