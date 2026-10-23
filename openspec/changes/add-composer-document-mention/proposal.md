## Why

Tracking: no GitHub issue yet (to be created before implementation).

Pointing an agent at one team document today takes a detour: open the tune
menu, open the document-scope panel, walk the library tree, tick the file,
close the panel. The selection itself already works end to end
(`selected_document_uids` reaches the runtime, which tells the model which
documents the user picked). What is missing is a fast way to reach it from the
place the user is already typing.

## What Changes

- Typing `@` at a word boundary in the chat composer opens a menu above it
  listing, by name, the team documents the current agent can query. Characters
  typed after `@` filter the list.
- The menu exists only for agents whose `document_scope` chat control allows
  per-document selection (`documents: true`). When the agent binds libraries
  (`bound_library_ids`), only documents from those libraries are offered;
  otherwise documents from all of the conversation's team libraries. Documents
  the user cannot read are never listed.
- Picking a document adds it to the conversation's document selection, the same
  state the document-scope panel edits, and removes the `@query` text from the
  draft. The existing tune badge and panel reflect it; nothing new is sent.
- Keyboard follows the `/` menu: `Up`/`Down` move, `Enter`/`Tab` pick, `Esc`
  closes and leaves the text alone.
- Knowledge Flow gains `POST /knowledge-flow/v1/documents/metadata/find`: the
  readable documents carrying one of the given library tags whose name contains
  a query, name-ordered, capped. The frontend client is regenerated.

## Capabilities

### New Capabilities

- `composer-document-mention`: invoking the conversation's document selection
  from the composer with `@`, and the bounded name lookup behind it.

### Modified Capabilities

None.

## Impact

- Knowledge Flow: one endpoint in `features/metadata/controller.py`, one
  service method in `features/metadata/service.py`, tests. No store, schema or
  fred-core change.
- Frontend: `RichInputField` reports `@` queries alongside `/` ones; a small
  `useDocumentMention` hook and a mention menu in `ManagedChatPage`; regenerated
  `knowledgeFlowOpenApi.ts`; fr/en translations; Help Center `features/chat.md`
  (fr, en); `docs/swift/ux/COMPONENT-UX.md`.
- Out of scope: session attachments (already always in scope when enabled), a
  visible token or chip for the picked document, libraries as `@` targets.
- Migration note: none operational (new optional UI path, additive endpoint) -
  patch.
