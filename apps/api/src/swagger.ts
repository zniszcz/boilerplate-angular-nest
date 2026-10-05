import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PUBLIC_EXTENSION, UNAUTHORIZED_EXAMPLE } from '@boilerplate/api-auth';

/**
 * OpenAPI document built from controllers and DTO classes. Every route
 * without @Public() gets the 401 that the auth guard returns.
 */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('API').addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, config);
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (typeof operation !== 'object' || !('responses' in operation)) {
        continue;
      }
      if (operation[PUBLIC_EXTENSION]) {
        delete operation[PUBLIC_EXTENSION];
        continue;
      }
      operation.responses['401'] = {
        description: 'Missing, expired or invalid access token',
        content: { 'application/json': { example: UNAUTHORIZED_EXAMPLE } },
      };
    }
  }
  return document;
}
