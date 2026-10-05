import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { FIELD_CODES, RESPONSE_CODES } from '@boilerplate/contracts';
import { PUBLIC_EXTENSION } from '@boilerplate/api-access';
import {
  ERROR_ENVELOPE_SCHEMA,
  errorResponse,
  NO_ENVELOPE_EXTENSION,
} from '@boilerplate/api-responses';

type OperationObject = NonNullable<OpenAPIObject['paths'][string]['get']>;
type SchemaObject = Record<string, unknown>;
interface ResponseObject {
  description: string;
  content?: Record<string, { schema?: unknown }>;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/**
 * OpenAPI document built from controllers and DTO classes, then adjusted to
 * the response envelope (docs/adr/0012-response-envelope.md):
 * - success bodies are wrapped in { status, code, data },
 * - every route without @Public() gets the 401 of the auth guard,
 * - every route gets the 500 fallback.
 */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('API').addBearerAuth().build();
  const document = SwaggerModule.createDocument(app, config);
  addEnvelopeSchemas(document);
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (typeof operation === 'object' && 'responses' in operation) {
        adjustOperation(operation);
      }
    }
  }
  return document;
}

function adjustOperation(operation: OperationObject): void {
  const extensions = operation as unknown as Record<string, unknown>;
  if (extensions[NO_ENVELOPE_EXTENSION]) {
    delete extensions[NO_ENVELOPE_EXTENSION];
    delete extensions[PUBLIC_EXTENSION];
    return;
  }
  for (const [status, value] of Object.entries(operation.responses)) {
    const response = value as ResponseObject;
    if (status.startsWith('2')) {
      const data = response.content?.['application/json']?.schema ?? {
        nullable: true,
        enum: [null],
      };
      response.content = {
        'application/json': { schema: successEnvelope(data) },
      };
    }
  }
  if (extensions[PUBLIC_EXTENSION]) {
    delete extensions[PUBLIC_EXTENSION];
  } else {
    operation.responses['401'] = errorResponse(
      'AUTH_UNAUTHENTICATED',
      'Missing or expired access token, or the account no longer exists. Refresh the session and repeat',
    );
  }
  operation.responses['500'] = errorResponse(
    'UNEXPECTED_ERROR',
    'An error nobody designed. A bug to fix, never returned on purpose',
  );
}

function successEnvelope(data: unknown): SchemaObject {
  return {
    type: 'object',
    required: ['status', 'code', 'data'],
    properties: {
      status: { type: 'string', enum: ['success'] },
      code: ref('ResponseCode'),
      data,
    },
  };
}

function addEnvelopeSchemas(document: OpenAPIObject): void {
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ResponseCode: { type: 'string', enum: [...RESPONSE_CODES] },
    FieldCode: { type: 'string', enum: [...FIELD_CODES] },
    FieldError: {
      type: 'object',
      required: ['field', 'code'],
      properties: {
        field: { type: 'string', example: 'email' },
        code: ref('FieldCode'),
        params: { type: 'object', additionalProperties: true },
      },
    },
    [ERROR_ENVELOPE_SCHEMA]: {
      type: 'object',
      required: ['status', 'code'],
      properties: {
        status: { type: 'string', enum: ['error'] },
        code: ref('ResponseCode'),
        params: { type: 'object', additionalProperties: true },
        details: { type: 'array', items: ref('FieldError') },
      },
    },
  };
}
