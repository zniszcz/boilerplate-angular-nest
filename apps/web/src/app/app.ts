import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { HelloDto } from '@boilerplate/contracts';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly hello: HelloDto = { message: 'Hello web' };
}
