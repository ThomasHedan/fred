## 0. Tracking

- [ ] 0.1 Create the GitHub issue, link it to the active milestone and replace the tracking line in proposal.md; verify with `gh issue view <n>`.
  - Open: issues are disabled on `thomashedan/fred` (API 410); to be opened upstream.

## 1. Knowledge Flow: name lookup

- [x] 1.1 Add `MetadataService.find_documents_in_tags(user, tag_ids, query, limit)` per design D1; verify with service tests: casefold substring, name order, limit, unreadable document dropped, empty `tag_ids` returning nothing.
- [x] 1.2 Add `POST /documents/metadata/find` with a `FindDocumentsRequest` (bounds per D1) returning `List[DocumentMetadata]`; verify with a controller test (200 with results, 422 on an out-of-range `limit`) and `make code-quality && make test` in `apps/knowledge-flow-backend`.
  - Done: the bounds are tested on `FindDocumentsRequest` directly (FastAPI turns that validation error into the 422), not through a mounted app.
- [x] 1.3 Regenerate the client (`cd apps/frontend && make update-knowledge-flow-api`); verify the only diff in `knowledgeFlowOpenApi.ts` is the new endpoint and its types.

## 2. Frontend: field seam

- [x] 2.1 Add `mentionQueryOf` and the `onMentionQueryChange` prop to `RichInputField` (design D2); verify with vitest cases: leading `@`, `@` after a space, an e-mail address, the caret in mid-draft, and no report when the prop is absent.

## 3. Frontend: menu and hook

- [x] 3.1 Add `DocumentMentionMenu` reusing `CommandMenu.module.css` (design D4); verify with a vitest render test for rows, the active row and the three empty states.
- [x] 3.2 Add `useDocumentMention` (design D3); verify with vitest: inert without `document_scope.documents`, bound libraries win over team tags, `Enter`/`Tab` add a uid once and remove the `@query` span, `Esc` leaves the draft, a stale answer is ignored.
- [x] 3.3 Wire the hook in `ManagedChatPage` (binding composition per D2, menu in `aboveFieldSlot`); verify with a `ManagedChatPage` test that picking a document updates the document selection and does not send.
  - Done: the pick is proven through the real field and menu in `useDocumentMention.test.tsx` (textarea and CodeMirror caret); the page suite only gained the two hook mocks.
- [x] 3.4 Add fr/en translations for the menu and its empty states; verify `npx tsc --noEmit -p .` and the i18n tests pass.

## 4. Documentation and release

- [x] 4.1 Describe `@` in Help Center `features/chat.md` (fr, en) and in `docs/swift/ux/COMPONENT-UX.md` next to the document-scope panel; verify both languages name the same behavior.
- [x] 4.2 Add a migration note under `docs/swift/ops/migrations/` (impact: none, patch); verify with `make migration-check MIGRATION_BASE=origin/swift`.
  - Done: the fork carries no release tag, so `migration-check` cannot run here; the note passes the repo's `parse_note` (impact `none`). CI re-checks it.

## 4b. Model-facing document records

- [x] 4b.1 Add `size_bytes` and `ready` (processing stages done) to the `list_document_tree` record; verify with `test_projects_arrival_and_descriptive_metadata_without_confusing_file_creation`.
- [x] 4b.2 Resolve the selected documents' records through `document_tree.tree(library_tag_ids=[], document_uids=...)` before composing the prompt (3 s, 8 000 chars, bare uids on failure or pruning), in both ReAct and Deep runtimes; verify with `test_describe_selected_documents_*` and `test_document_scope_suffix_lists_records_when_resolved`, and the full offline `fred-runtime` suite.
- [x] 4b.3 Describe the records in `docs/swift/design/PROMPTS.md` and the `list_document_tree` docstring.

## 5. Verification

- [x] 5.1 Run root `make code-quality` and the touched modules' `make test`; record counts in the PR.
  - Done: frontend `tsc`, prettier, eslint clean; full vitest 4467 passed, 8 skipped. Knowledge Flow ruff (lint, imports, format), bandit and basedpyright clean except the pre-existing missing `torch` import; `tests/features` 722 passed, 1 failed on `import torch` (the sandbox cannot download torch). Root `make code-quality` cannot run here for the same reason.
- [x] 5.2 Run the `fred-performance-reviewer` skill on the endpoint and the debounced lookup; verify no finding is left open.
  - Done: not on an agent hot path; all I/O is async. One measured-risk item, accepted as design D1's trade-off: each lookup deserializes every in-scope document row on the event loop, so latency grows with the team corpus. Follow-up if a team shows it: the SQL name filter.

## Workflow follow-up

- Archive the change once merged (`openspec archive add-composer-document-mention`) and close the issue.
