import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { HelloResponse } from '@boilerplate/contracts';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly hello: HelloResponse = { message: 'Hello web' };
}
