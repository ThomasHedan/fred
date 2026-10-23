## Purpose

Lets a chat user add a team document to the conversation's document selection
by typing `@` and its name in the composer, limited to what the agent may query.

## ADDED Requirements

### Requirement: The mention menu follows the agent's document scope

The composer SHALL offer the `@` mention menu only when the agent's resolved
chat controls include a `document_scope` control allowing per-document
selection. The documents offered MUST belong to the agent's bound libraries when
it binds any, and otherwise to the conversation team's libraries.

#### Scenario: Agent without per-document selection

- **WHEN** the agent exposes no `document_scope` control, or one without per-document selection
- **THEN** typing `@` is ordinary text and no menu opens

#### Scenario: Agent bound to libraries

- **WHEN** the agent binds libraries A and the team also has library B
- **THEN** the menu lists matching documents from A only

#### Scenario: Agent not bound to libraries

- **WHEN** the agent allows per-document selection and binds no library
- **THEN** the menu lists matching documents from every library of the conversation's team

### Requirement: Typing `@` opens a filtered document menu

Typing `@` at the start of the draft or after whitespace SHALL open a menu above
the composer. The text between `@` and the caret MUST filter documents by a
case-insensitive substring of their name. An `@` inside a word (an e-mail
address) MUST NOT open it.

#### Scenario: Filtering by name

- **WHEN** the user types `voir @rapp`
- **THEN** the menu lists readable in-scope documents whose name contains `rapp`, ignoring case, ordered by name

#### Scenario: E-mail address

- **WHEN** the user types `jean@example.com`
- **THEN** no menu opens

#### Scenario: Nothing matches

- **WHEN** no in-scope document matches the query
- **THEN** the menu says so and `Enter` sends the message as usual

### Requirement: Picking a document selects it for the conversation

Picking a document SHALL add it to the conversation's document selection, the
same selection the document-scope panel edits, and MUST remove the `@query`
text from the draft. A document already selected stays selected once.

#### Scenario: Pick with the keyboard

- **WHEN** the menu is open on `@rapp` and the user presses `Enter` or `Tab`
- **THEN** the focused document is added to the selection, `@rapp` is removed from the draft, and nothing is sent

#### Scenario: Escape

- **WHEN** the user presses `Esc` with the menu open
- **THEN** the menu closes and the draft is unchanged

### Requirement: The name lookup only returns readable documents

Knowledge Flow SHALL return, for a list of library tags and a query, the
documents carrying one of those tags whose name contains the query, ignoring
case. It MUST return only documents the caller may read, ordered by name, and
at most the requested limit.

#### Scenario: Unreadable document

- **WHEN** a matching document in a requested library is not readable by the caller
- **THEN** it is not returned

#### Scenario: Limit

- **WHEN** more documents match than the limit
- **THEN** only the first `limit` by name are returned
