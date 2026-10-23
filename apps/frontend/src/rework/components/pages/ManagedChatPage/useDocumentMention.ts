// Copyright Thales 2026
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useCallback, useEffect, useId, useState } from "react";
import type { CommandKeyEvent, CommandTriggerBinding } from "@shared/molecules/RichInputField/RichInputField";
import type { DocumentMentionMenuProps } from "@shared/molecules/DocumentMentionMenu/DocumentMentionMenu";
import { useFrontendBootstrap } from "../../../../hooks/useFrontendBootstrap";
import {
  type DocumentMetadata,
  type TagType,
  useFindDocumentsKnowledgeFlowV1DocumentsMetadataFindPostMutation,
  useListTagsQuery,
} from "../../../../slices/knowledgeFlow/knowledgeFlowOpenApi";

type Range = { start: number; end: number };
type SelectionRequest = NonNullable<CommandTriggerBinding["selectionRequest"]>;

/**
 * The composer's `@` menu: picks a team document the agent can query into the
 * conversation's document selection. Offered only when the agent's
 * `document_scope` control allows per-document selection; while open, it takes
 * the keys and combobox state of the `/` menu's binding.
 */
export function useDocumentMention(params: {
  teamId: string;
  /** The agent's `document_scope` control params, absent when it exposes none. */
  documentScope?: { documents?: boolean; bound_library_ids?: string[] | null };
  input: string;
  onDraftChange: (value: string) => void;
  selectedDocumentUids: string[];
  onSelectedDocumentUidsChange: (uids: string[]) => void;
  trigger: CommandTriggerBinding;
}): {
  onQueryChange: (query: string | null, range?: Range) => void;
  trigger: CommandTriggerBinding;
  menu: DocumentMentionMenuProps | null;
} {
  const { teamId, input, trigger: base, documentScope } = params;
  const enabled = documentScope?.documents === true;
  const boundLibraryIds = documentScope?.bound_library_ids ?? [];

  const menuId = useId();
  const [mention, setMention] = useState<{ query: string; range: Range } | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [result, setResult] = useState<{ key: string; documents: DocumentMetadata[]; error?: boolean }>();
  // Our caret request wins until the `/` menu issues a newer one of its own.
  const [ownRequest, setOwnRequest] = useState<{ base?: SelectionRequest; own: SelectionRequest }>();

  const mentionKey = mention && `${mention.range.start}:${mention.query}`;
  const open = enabled && focused && mention !== null && mentionKey !== dismissedKey;

  // Same arguments as DocumentLibraryScopePicker, so both read one cache entry.
  const { activeTeam } = useFrontendBootstrap();
  const isPersonalTeam = teamId === activeTeam?.id;
  const { data: teamTags, isError: tagsFailed } = useListTagsQuery(
    {
      type: "document" as TagType,
      limit: 10000,
      offset: 0,
      ownerFilter: isPersonalTeam ? "personal" : "team",
      teamId: isPersonalTeam ? undefined : teamId,
    },
    { skip: !open || boundLibraryIds.length > 0 },
  );
  const tagIds = boundLibraryIds.length > 0 ? boundLibraryIds : (teamTags?.map((tag) => tag.id) ?? []);

  const [findDocuments] = useFindDocumentsKnowledgeFlowV1DocumentsMetadataFindPostMutation();
  const requestKey = open && tagIds.length > 0 ? JSON.stringify([tagIds, mention.query]) : null;
  useEffect(() => {
    if (!requestKey) return;
    const [tag_ids, query] = JSON.parse(requestKey) as [string[], string];
    // An answer for a query the user has since changed is dropped, never shown.
    let live = true;
    const timer = setTimeout(() => {
      findDocuments({ findDocumentsRequest: { tag_ids, query } })
        .unwrap()
        .then(
          (documents) => live && setResult({ key: requestKey, documents }),
          () => live && setResult({ key: requestKey, documents: [], error: true }),
        );
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [requestKey, findDocuments]);

  const current = requestKey !== null && result?.key === requestKey ? result : undefined;
  const documents = current?.documents ?? [];
  const noLibrary = boundLibraryIds.length === 0 && teamTags?.length === 0;
  const empty = noLibrary ? "noMatch" : tagsFailed || current?.error ? "error" : !current ? "loading" : "noMatch";
  const safeIndex = Math.min(activeIndex, Math.max(documents.length - 1, 0));

  const onQueryChange = useCallback((query: string | null, range?: Range) => {
    setMention(query === null || !range ? null : { query, range });
    setActiveIndex(0);
  }, []);

  const pick = (index: number) => {
    const doc = documents[index];
    if (!doc || !mention) return;
    const { start, end } = mention.range;
    // Take one space along, so `voir @rapp suite` does not leave two behind.
    const cut = input[end] === " " && (start === 0 || /\s/.test(input[start - 1])) ? end + 1 : end;
    params.onDraftChange(input.slice(0, start) + input.slice(cut));
    const uid = doc.identity.document_uid;
    if (!params.selectedDocumentUids.includes(uid))
      params.onSelectedDocumentUidsChange([...params.selectedDocumentUids, uid]);
    setOwnRequest({ base: base.selectionRequest, own: { id: 0, caret: start } });
  };

  const onKeyDown = (event: CommandKeyEvent) => {
    if (event.nativeEvent.isComposing) return base.onKeyDown(event);
    const count = documents.length;
    if (event.key === "Escape") {
      event.preventDefault();
      setDismissedKey(mentionKey);
      return true;
    }
    if (count > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      // The focus stops at either end, as in the `/` menu.
      setActiveIndex(Math.max(0, Math.min(count - 1, safeIndex + (event.key === "ArrowDown" ? 1 : -1))));
      return true;
    }
    // While the answer is on its way, Enter waits for it rather than sending the `@query`.
    if ((count > 0 || empty === "loading") && (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey))) {
      event.preventDefault();
      if (count > 0) pick(safeIndex);
      return true;
    }
    return base.onKeyDown(event);
  };

  const optionId = (index: number) => `${menuId}-option-${index}`;
  const selectionRequest =
    ownRequest && ownRequest.base === base.selectionRequest ? ownRequest.own : base.selectionRequest;
  const onFocusChange = (next: boolean) => {
    setFocused(next);
    base.onFocusChange(next);
  };
  return {
    onQueryChange,
    trigger: open
      ? {
          ...base,
          selectionRequest,
          onFocusChange,
          onKeyDown,
          open: true,
          listboxId: menuId,
          activeDescendantId: documents.length > 0 ? optionId(safeIndex) : null,
        }
      : { ...base, selectionRequest, onFocusChange },
    menu: open
      ? {
          id: menuId,
          documents,
          activeIndex: safeIndex,
          empty,
          optionId,
          onActivate: pick,
          onFocusEntry: setActiveIndex,
        }
      : null,
  };
}
