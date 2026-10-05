// Writes the OpenAPI document to the file given as the first argument.
// Preview mode builds the routes without connecting to the database.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { createOpenApiDocument } from './swagger';

async function writeOpenApi() {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  app.setGlobalPrefix('api');
  const file = process.argv[2] ?? 'openapi.json';
  // The folder, such as tmp/, does not exist in a fresh clone.
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(createOpenApiDocument(app), null, 2));
  await app.close();
}

writeOpenApi().catch((error) => {
  console.error(error);
  process.exit(1);
});
