---
schema: 1
title: "Pick a team document with @ in the chat composer"
impact: none
configuration: none
configuration_reason: "New frontend path and an additive Knowledge Flow endpoint; no configuration keys or defaults change."
no_action_reason: "The @ menu reuses the existing document selection and access checks, and the richer document records in the prompt are read from the existing tree endpoint; there is no data to migrate."
---

## Applicability

Existing Fred deployments upgrading to this release.

## Prerequisites

No additional prerequisites beyond the normal deployment procedure.

## Configuration

No configuration changes are required.

## Upgrade

Deploy Fred normally; no additional operator or user action is required.

## Validation

With an agent that allows document selection, type `@` and part of a document name in the chat composer: the matching team documents are listed, and picking one adds it to the conversation's document selection.

## Rollback

Use the normal rollback procedure; this change introduces no data migration.

## Limitations

No additional migration limitations identified for this change.
