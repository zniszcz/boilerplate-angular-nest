import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PasswordGenerator } from '../application';

@Injectable()
export class CryptoPasswordGenerator extends PasswordGenerator {
  /** 18 random bytes: 24 characters of base64url, 144 bits. */
  generate(): string {
    return randomBytes(18).toString('base64url');
  }
}
