import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LANGUAGES, saveLanguage } from './i18n';

@Component({
  imports: [RouterOutlet, TranslocoPipe],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly transloco = inject(TranslocoService);
  protected readonly languages = LANGUAGES;
  protected readonly activeLanguage = toSignal(this.transloco.langChanges$);

  protected setLanguage(language: string): void {
    this.transloco.setActiveLang(language);
    saveLanguage(language);
  }
}
