import { Component } from '@angular/core';

/** Blocks one under another with even spacing, so pages need no classes. */
@Component({
  selector: 'app-stack',
  template: `<ng-content />`,
  host: { class: 'grid gap-4 sm:gap-6' },
})
export class Stack {}
