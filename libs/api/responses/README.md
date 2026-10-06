# api-responses

The response envelope for the backend: coded exceptions, the Swagger
decorator for errors and the marker for routes without an envelope. See
[ADR 0012](../../../docs/adr/0012-response-envelope.md).

## Impact

What else a change here needs:

- A change to the envelope changes every response: the types in `libs/shared/contracts` and the error handling of the web app ([ADR 0012](../../../docs/adr/0012-response-envelope.md)).
