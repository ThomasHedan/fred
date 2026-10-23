// @vitest-environment jsdom
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

// The `@` menu driven through the real composer and menu, with the `/` menu's
// binding reduced to a stub that never claims a key.

import { EditorView } from "@codemirror/view";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentMentionMenu } from "@shared/molecules/DocumentMentionMenu/DocumentMentionMenu";
import { RichInputField, type CommandTriggerBinding } from "@shared/molecules/RichInputField/RichInputField";
import type { ChatControlDescriptor } from "../../../../slices/controlPlane/controlPlaneOpenApi";
import { useDocumentMention } from "./useDocumentMention";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("../../../../hooks/useFrontendBootstrap", () => ({
  useFrontendBootstrap: () => ({ activeTeam: { id: "personal" } }),
}));

const doc = (name: string) => ({ identity: { document_uid: `uid-${name}`, document_name: name } });
const findDocuments = vi.fn();
vi.mock("../../../../slices/knowledgeFlow/knowledgeFlowOpenApi", () => ({
  useListTagsQuery: (_args: unknown, options: { skip: boolean }) => ({
    data: options.skip ? undefined : [{ id: "team-lib-1" }, { id: "team-lib-2" }],
  }),
  useFindDocumentsKnowledgeFlowV1DocumentsMetadataFindPostMutation: () => [findDocuments],
}));

const scope = (params: Record<string, unknown>) =>
  [{ widget: "document_scope", params }] as unknown as ChatControlDescriptor[];

let container: HTMLDivElement;
let root: Root;
let selected: string[];
const send = vi.fn();

function Host({ chatControls, inline }: { chatControls: ChatControlDescriptor[]; inline?: boolean }) {
  const [input, setInput] = useState("");
  const [uids, setUids] = useState<string[]>([]);
  selected = uids;
  const base: CommandTriggerBinding = {
    onQueryChange: () => {},
    onKeyDown: () => false,
    onFocusChange: () => {},
    listboxId: "commands",
    open: false,
    activeDescendantId: null,
  };
  const mention = useDocumentMention({
    teamId: "team-1",
    chatControls,
    input,
    onDraftChange: setInput,
    selectedDocumentUids: uids,
    onSelectedDocumentUidsChange: setUids,
    trigger: base,
  });
  return (
    <RichInputField
      value={input}
      onChange={setInput}
      onSend={send}
      commandTrigger={mention.trigger}
      onMentionQueryChange={mention.onQueryChange}
      aboveFieldSlot={mention.menu ? <DocumentMentionMenu {...mention.menu} /> : undefined}
      inlineSkills={inline ? { tokens: [] } : undefined}
    />
  );
}

function render(chatControls: ChatControlDescriptor[], inline = false) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Host chatControls={chatControls} inline={inline} />));
  if (!inline) act(() => textarea().focus());
}

const textarea = () => container.querySelector("textarea") as HTMLTextAreaElement;
const options = () => Array.from(container.querySelectorAll('[role="option"]')).map((row) => row.getAttribute("title"));

async function type(text: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(textarea(), text);
    textarea().setSelectionRange(text.length, text.length);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
}

function press(key: string) {
  act(() => {
    textarea().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  send.mockReset();
  findDocuments.mockReset();
  findDocuments.mockImplementation(() => ({
    unwrap: () => Promise.resolve([doc("a-rapport.pdf"), doc("b-rapport.pdf")]),
  }));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("useDocumentMention", () => {
  it("stays out of the way when the agent offers no per-document selection", async () => {
    render(scope({ documents: false }));
    await type("@rap");

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(findDocuments).not.toHaveBeenCalled();
  });

  it("searches the team's libraries, or only the agent's bound ones", async () => {
    render(scope({ documents: true }));
    await type("voir @rap");
    expect(findDocuments).toHaveBeenLastCalledWith({
      findDocumentsRequest: { tag_ids: ["team-lib-1", "team-lib-2"], query: "rap" },
    });
    act(() => root.unmount());
    container.remove();

    render(scope({ documents: true, bound_library_ids: ["bound-lib"] }));
    await type("@rap");
    expect(findDocuments).toHaveBeenLastCalledWith({ findDocumentsRequest: { tag_ids: ["bound-lib"], query: "rap" } });
  });

  it("picks the focused document once and removes the query from the draft", async () => {
    render(scope({ documents: true }));
    await type("voir @rap");
    expect(options()).toEqual(["a-rapport.pdf", "b-rapport.pdf"]);

    press("ArrowDown");
    press("Enter");

    expect(selected).toEqual(["uid-b-rapport.pdf"]);
    expect(textarea().value).toBe("voir ");
    expect(send).not.toHaveBeenCalled();

    await type("voir @rap");
    press("ArrowDown");
    press("Tab");
    expect(selected).toEqual(["uid-b-rapport.pdf"]);
  });

  it("puts the caret where the query was in the inline editor", async () => {
    render(scope({ documents: true }), true);
    const view = EditorView.findFromDOM(container.querySelector(".cm-content")!)!;
    act(() => view.contentDOM.focus());
    act(() => view.dispatch({ changes: { from: 0, insert: "voir @ra suite" }, selection: { anchor: 8 } }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    act(() =>
      view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })),
    );

    expect(view.state.doc.toString()).toBe("voir suite");
    expect(view.state.selection.main.head).toBe(5);
    expect(selected).toEqual(["uid-a-rapport.pdf"]);
  });

  it("closes on Escape and leaves the draft alone", async () => {
    render(scope({ documents: true }));
    await type("@rap");

    press("Escape");

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(textarea().value).toBe("@rap");
  });

  it("never shows an answer that arrives for an older query", async () => {
    let answerOld: (docs: unknown[]) => void = () => {};
    findDocuments.mockImplementationOnce(() => ({
      unwrap: () => new Promise((resolve) => (answerOld = resolve)),
    }));
    render(scope({ documents: true }));
    await type("@ra");
    await type("@rapp");
    await act(async () => answerOld([doc("stale.pdf")]));

    expect(options()).toEqual(["a-rapport.pdf", "b-rapport.pdf"]);
  });
});
