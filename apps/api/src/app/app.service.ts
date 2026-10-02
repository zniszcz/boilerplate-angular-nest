import { Injectable } from '@nestjs/common';
import type { HelloDto } from './hello.dto';

@Injectable()
export class AppService {
  getData(): HelloDto {
    return { message: 'Hello API' };
  }
}
