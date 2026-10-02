import { access, constants } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { mediaDirFromEnv } from '../config/media-dir';

@Injectable()
export class MediaHealthIndicator {
  constructor(private readonly health: HealthIndicatorService) {}

  async isWritable(key: string) {
    const indicator = this.health.check(key);
    try {
      await access(mediaDirFromEnv(), constants.W_OK);
      return indicator.up();
    } catch (error) {
      return indicator.down((error as Error).message);
    }
  }
}
