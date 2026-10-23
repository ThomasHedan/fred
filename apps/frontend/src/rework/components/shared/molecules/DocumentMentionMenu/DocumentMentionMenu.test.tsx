// @vitest-environment happy-dom
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

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DocumentMetadata } from "../../../../../slices/knowledgeFlow/knowledgeFlowOpenApi";
import { DocumentMentionMenu, type DocumentMentionMenuProps } from "./DocumentMentionMenu";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const doc = (name: string) => ({ identity: { document_uid: name, document_name: name } }) as DocumentMetadata;

function render(documents: DocumentMetadata[], props: Partial<DocumentMentionMenuProps> = {}) {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <DocumentMentionMenu
      id="menu"
      documents={documents}
      activeIndex={0}
      empty="noMatch"
      optionId={(index) => `option-${index}`}
      onActivate={() => {}}
      onFocusEntry={() => {}}
      {...props}
    />,
  );
  return host;
}

describe("DocumentMentionMenu", () => {
  it("lists documents and marks the active one", () => {
    const host = render([doc("a.pdf"), doc("b.pdf")], { activeIndex: 1 });
    const rows = Array.from(host.querySelectorAll('[role="option"]'));

    expect(rows.map((row) => row.getAttribute("title"))).toEqual(["a.pdf", "b.pdf"]);
    expect(rows.map((row) => row.getAttribute("aria-selected"))).toEqual(["false", "true"]);
  });

  it.each(["loading", "error", "noMatch"] as const)("says %s instead of an empty list", (empty) => {
    const host = render([], { empty });

    expect(host.querySelector('[role="listbox"]')).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toBe(`chatbot.documentMention.${empty}`);
  });
});
