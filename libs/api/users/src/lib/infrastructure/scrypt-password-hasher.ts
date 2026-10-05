import { Injectable } from '@nestjs/common';
import { verifyPassword } from '@boilerplate/api-access';
import { PasswordHasher } from '../application';

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  verify(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }
}
