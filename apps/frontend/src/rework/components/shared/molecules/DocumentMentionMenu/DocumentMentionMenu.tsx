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

// The composer's `@` menu: team documents the agent can query. Same look and
// pointer behaviour as the `/` menu, whose styles it shares.

import { useTranslation } from "react-i18next";
import Icon from "@shared/atoms/Icon/Icon";
import { fileIconSpec } from "../../../../utils/fileIconSpec";
import type { DocumentMetadata } from "../../../../../slices/knowledgeFlow/knowledgeFlowOpenApi";
import styles from "../CommandMenu/CommandMenu.module.css";

export interface DocumentMentionMenuProps {
  id: string;
  documents: DocumentMetadata[];
  activeIndex: number;
  /** Why `documents` is empty. */
  empty: "loading" | "error" | "noMatch";
  optionId: (index: number) => string;
  onActivate: (index: number) => void;
  onFocusEntry: (index: number) => void;
}

export function DocumentMentionMenu({
  id,
  documents,
  activeIndex,
  empty,
  optionId,
  onActivate,
  onFocusEntry,
}: DocumentMentionMenuProps) {
  const { t } = useTranslation();

  if (documents.length === 0) {
    return (
      <div id={id} className={styles.menu} role="status">
        <p className={styles.empty}>{t(`chatbot.documentMention.${empty}`)}</p>
      </div>
    );
  }

  return (
    <div id={id} className={styles.menu} role="listbox" aria-label={t("chatbot.documentMention.ariaLabel")}>
      {documents.map((doc, index) => {
        const icon = fileIconSpec(doc.file?.file_type);
        return (
          <div
            key={doc.identity.document_uid}
            id={optionId(index)}
            className={styles.row}
            role="option"
            aria-selected={index === activeIndex}
            data-active={index === activeIndex}
            title={doc.identity.document_name}
            onMouseMove={() => onFocusEntry(index)}
            // On mousedown with the default suppressed, so the caret stays in the composer.
            onMouseDown={(event) => {
              event.preventDefault();
              onActivate(index);
            }}
          >
            <span className={styles.rowIcon} style={{ color: icon.color }} aria-hidden>
              <Icon category="outlined" type={icon.type} filled={icon.filled} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowLabel}>{doc.identity.document_name}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
