import { Directive } from '@angular/core';

/** Styles a native input. Large touch target and 16px text on phones. */
@Directive({
  selector: 'input[appInput]',
  host: {
    class:
      'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:py-2',
  },
})
export class Input {}
