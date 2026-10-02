import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** OpenAPI document built from controllers and DTO classes. */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('API').addBearerAuth().build();
  return SwaggerModule.createDocument(app, config);
}
