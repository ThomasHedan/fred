## 0. Tracking

- [ ] 0.1 Create the GitHub issue, link it to the active milestone and replace the tracking line in proposal.md; verify with `gh issue view <n>`.

## 1. Knowledge Flow: name lookup

- [ ] 1.1 Add `MetadataService.find_documents_in_tags(user, tag_ids, query, limit)` per design D1; verify with service tests: casefold substring, name order, limit, unreadable document dropped, empty `tag_ids` returning nothing.
- [ ] 1.2 Add `POST /documents/metadata/find` with a `FindDocumentsRequest` (bounds per D1) returning `List[DocumentMetadata]`; verify with a controller test (200 with results, 422 on an out-of-range `limit`) and `make code-quality && make test` in `apps/knowledge-flow-backend`.
- [ ] 1.3 Regenerate the client (`cd apps/frontend && make update-knowledge-flow-api`); verify the only diff in `knowledgeFlowOpenApi.ts` is the new endpoint and its types.

## 2. Frontend: field seam

- [ ] 2.1 Add `mentionQueryOf` and the `onMentionQueryChange` prop to `RichInputField` (design D2); verify with vitest cases: leading `@`, `@` after a space, an e-mail address, the caret in mid-draft, and no report when the prop is absent.

## 3. Frontend: menu and hook

- [ ] 3.1 Add `DocumentMentionMenu` reusing `CommandMenu.module.css` (design D4); verify with a vitest render test for rows, the active row and the three empty states.
- [ ] 3.2 Add `useDocumentMention` (design D3); verify with vitest: inert without `document_scope.documents`, bound libraries win over team tags, `Enter`/`Tab` add a uid once and remove the `@query` span, `Esc` leaves the draft, a stale answer is ignored.
- [ ] 3.3 Wire the hook in `ManagedChatPage` (binding composition per D2, menu in `aboveFieldSlot`); verify with a `ManagedChatPage` test that picking a document updates the document selection and does not send.
- [ ] 3.4 Add fr/en translations for the menu and its empty states; verify `npx tsc --noEmit -p .` and the i18n tests pass.

## 4. Documentation and release

- [ ] 4.1 Describe `@` in Help Center `features/chat.md` (fr, en) and in `docs/swift/ux/COMPONENT-UX.md` next to the document-scope panel; verify both languages name the same behavior.
- [ ] 4.2 Add a migration note under `docs/swift/ops/migrations/` (impact: none, patch); verify with `make migration-check MIGRATION_BASE=origin/swift`.

## 5. Verification

- [ ] 5.1 Run root `make code-quality` and the touched modules' `make test`; record counts in the PR.
- [ ] 5.2 Run the `fred-performance-reviewer` skill on the endpoint and the debounced lookup; verify no finding is left open.

## Workflow follow-up

- Archive the change once merged (`openspec archive add-composer-document-mention`) and close the issue.
