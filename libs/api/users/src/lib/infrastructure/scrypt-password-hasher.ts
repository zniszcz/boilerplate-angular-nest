import { Injectable } from '@nestjs/common';
import { hashPassword, verifyPassword } from '@boilerplate/api-access';
import { PasswordHasher } from '../application';

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }
}
