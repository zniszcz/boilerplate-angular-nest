import { Controller, Get } from '@nestjs/common';
import { Public } from '@boilerplate/api-auth';
import { AppService } from './app.service';
import { HelloDto } from './hello.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getData(): HelloDto {
    return this.appService.getData();
  }
}
