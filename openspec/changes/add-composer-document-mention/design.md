## Context

- The conversation's document selection is `selectedDocumentUids` in
  `useComposerSettings` (sticky per session). It is sent as
  `selected_document_uids`, and `react_prompting.py` already tells the model
  which documents were picked. The document-scope panel is its only editor
  today.
- What the agent may query reaches the frontend as the `document_scope` chat
  control: `documents` (per-document selection allowed) and `bound_library_ids`.
  The control exists only while `document_access.team_documents` is on.
- The `/` menu lives in `useComposerCommands` and talks to the field through one
  `CommandTriggerBinding` (keys, focus, combobox ARIA). `RichInputField` derives
  the `/` query from the value and caret it already tracks, for both the
  textarea and the CodeMirror editor.
- Knowledge Flow has no team-scoped name lookup: `/documents/metadata/search`
  loads the whole table, `/documents/metadata/browse` takes one tag and pages.

## Goals / Non-Goals

**Goals:** add `@` without touching `useComposerCommands` internals; no new
store, schema or fred-core change.

**Non-Goals:** a token or chip for the picked document; mentioning libraries;
session attachments.

## Decisions

### D1. One Knowledge Flow endpoint on existing store calls

`POST /documents/metadata/find` takes `{tag_ids, query, limit}` (`tag_ids` 1-500,
`query` up to 200 characters, `limit` 1-50, default 20) and returns
`List[DocumentMetadata]`, the type `/search` already returns. The service calls
`metadata_store.metadata_in_tags` (one indexed array-overlap query), keeps the
names containing the query (casefold), sorts by name, filters them with
`filter_readable_document_uids` and cuts at `limit`.

- Extending `/browse` was rejected: its contract is one tag with pagination.
- Extending `/search` was rejected: it is a full-table scan by design.
- An SQL `ILIKE` in the store was rejected for now: it changes the published
  fred-core store interface (both backends, version bump) for a gain that only
  matters on very large team corpora.

### D2. The field reports `@` queries; the host composes the binding

`RichInputField` gets one optional prop, `onMentionQueryChange(query | null,
range)`, fed by a pure `mentionQueryOf(value, caret)`
(`(?:^|\s)@([^\s@]*)$` before the caret), reported the same way as the `/` query.
`ManagedChatPage` passes `commandTrigger` unchanged while the mention menu is
closed. While it is open, it passes the same binding with `open`,
`listboxId`, `activeDescendantId` and `onKeyDown` taken from the mention hook.
So `InlineSkillInput` and `useComposerCommands` stay as they are.

- A second full `mentionTrigger` binding in the field was rejected: it would
  duplicate the combobox wiring in both editors.
- Folding `@` into `useComposerCommands` was rejected: that hook owns prompt
  tokens, undo history and submit, none of which `@` needs.

### D3. `useDocumentMention` owns the menu

A hook next to `useComposerCommands` returns `{ onQueryChange, menu, binding }`.
It is inert unless `document_scope.documents` is true. It resolves the tag ids
(bound libraries, or the team's document tags from `useListTagsQuery` with the
same arguments as `DocumentLibraryScopePicker`, so the cache is shared), and
calls the generated `find` mutation with a 150 ms debounce, keeping the latest
answer only. Picking a document calls `setSelectedDocumentUids` (deduplicated)
and removes the `@query` span through `commands.onComposerChange`, so prompt
and skill tokens after it shift correctly.

### D4. The menu reuses the `/` menu's look

`DocumentMentionMenu` is a small listbox molecule rendered in
`aboveFieldSlot` in place of `CommandMenu`. It reuses
`CommandMenu.module.css` and `fileIconSpec` for the row icon, so it adds no new
styles. The empty states are loading, error and no match.

## Risks / Trade-offs

- [Large team corpora load every in-scope row's metadata per lookup] →
  debounce, plus a single indexed query. The SQL filter (D1, rejected
  alternative) is the follow-up if a team shows latency.
- [ReBAC is checked on every name match, not only the first `limit`] → it is one
  batched call, and a non-empty query narrows it quickly.
- [Unbound agents fetch the team tag list on first `@`] → the list is the
  cached one the picker uses.

## Migration Plan

Additive endpoint and UI path; no data migration. Rollback is a plain revert.
