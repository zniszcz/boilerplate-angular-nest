# <Feature in a few words>

## Goal

One sentence: who gets what, and why it matters to them.

## Scenarios

Each becomes a scenario in a `.feature` file, in the words of
`apps/web-e2e/features`.

- **<Scenario name>**
  - Given <state>
  - When <action>
  - Then <what the user sees>

## Rules and edge cases

Domain rules and limits, each one testable: "an order needs at least one
line", "a name has at most 80 characters".

## Errors

What the user sees when something goes wrong, with the response code from
the catalog if the API is involved.

## Data and API

New or changed entities, fields, routes and permissions. Leave out what
does not change.

## Out of scope

What this feature does not do, so nobody builds it by accident.

## Open questions

Must be empty before planning.
