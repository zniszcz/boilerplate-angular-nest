import { Injectable } from '@nestjs/common';
import type { HelloResponse } from '@boilerplate/contracts';

@Injectable()
export class AppService {
  getData(): HelloResponse {
    return { message: 'Hello API' };
  }
}
