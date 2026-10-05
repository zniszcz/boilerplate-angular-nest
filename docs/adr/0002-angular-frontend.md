# 0002. Angular for the frontend

- Status: Accepted
- Date: 2026-10-01

## Context

The template needs one frontend framework. The candidates were React and
Angular.

## Decision

Angular. The template serves new projects, and Angular is needed at work.
An existing React project can still take the backend, configuration and
deployment from the template without rewriting its frontend.

## Consequences

- Frontend tooling follows Angular: angular-eslint, Transloco, NgRx Signal
  Store.
- React projects reuse only `apps/api`, `libs/api` and the infrastructure.
