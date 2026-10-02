import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@boilerplate/api-auth';
import { MediaHealthIndicator } from './media.health';

/**
 * Probes for Kubernetes.
 * - live: the process answers. Never checks dependencies, because a failed
 *   liveness probe restarts the pod and a restart does not fix a database.
 * - ready: everything the app cannot work without. A failure only stops
 *   traffic to the pod. Optional services go here as `degraded`, which keeps
 *   the answer at 200.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly media: MediaHealthIndicator,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.database.pingCheck('database'),
      () => this.media.isWritable('media'),
    ]);
  }
}
