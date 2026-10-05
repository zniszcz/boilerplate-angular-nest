import {
  applyDecorators,
  Catch,
  SetMetadata,
  UseFilters,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ApiExtension } from '@nestjs/swagger';

export const NO_ENVELOPE = 'envelope:off';
export const NO_ENVELOPE_EXTENSION = 'x-no-envelope';

/** Sends errors in Nest's default shape, for routes without an envelope. */
@Catch()
export class RawExceptionFilter extends BaseExceptionFilter {}

/**
 * Turns the envelope off for a route or a controller whose client is not the
 * web app, such as the Kubernetes health probes.
 */
export const NoEnvelope = () =>
  applyDecorators(
    SetMetadata(NO_ENVELOPE, true),
    ApiExtension(NO_ENVELOPE_EXTENSION, true),
    UseFilters(RawExceptionFilter),
  );
