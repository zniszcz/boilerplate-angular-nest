import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MediaHealthIndicator } from './media.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [MediaHealthIndicator],
})
export class HealthModule {}
