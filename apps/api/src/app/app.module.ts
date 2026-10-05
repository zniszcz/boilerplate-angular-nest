import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '@boilerplate/api-access';
import { AuthenticationModule } from '@boilerplate/api-authentication';
import { UsersModule } from '@boilerplate/api-users';
import { dataSourceOptions } from '../database/data-source';
import { HealthModule } from '../health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }),
    AccessModule,
    UsersModule,
    AuthenticationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
