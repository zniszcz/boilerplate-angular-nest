import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { AuthModule } from '@boilerplate/api-auth';
import { UsersModule } from '@boilerplate/api-users';
import { dataSourceOptions } from '../database/data-source';
import { HealthModule } from '../health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }),
    // Messages in src/i18n/<language>/<file>.json, key `<file>.<key>`.
    // The language comes from the Accept-Language header.
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: { path: join(__dirname, 'i18n') },
      resolvers: [AcceptLanguageResolver],
    }),
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
