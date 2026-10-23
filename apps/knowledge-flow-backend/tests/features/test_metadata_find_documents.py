# Copyright Thales 2026
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Name lookup behind the composer's `@` document menu."""

from types import SimpleNamespace

import pytest
from fred_core.documents.document_structures import DocumentMetadata, Identity, SourceInfo, SourceType, Tagging
from pydantic import ValidationError

from knowledge_flow_backend.features.metadata.controller import FindDocumentsRequest
from knowledge_flow_backend.features.metadata.service import MetadataService
from tests.conftest import _InMemoryTestMetadataStore

USER = SimpleNamespace(uid="reader")


class _Rebac:
    def __init__(self, denied: frozenset[str] = frozenset()):
        self.denied = denied
        self.checked: list[str] = []

    async def has_user_permission(self, user, permission, uid):
        self.checked.append(uid)
        return uid not in self.denied


async def _service(names: list[str], tag_ids=("lib-a",), denied: frozenset[str] = frozenset()) -> MetadataService:
    store = _InMemoryTestMetadataStore()
    for name in names:
        await store.save_metadata(
            DocumentMetadata(
                identity=Identity(document_name=name, document_uid=name, title=name),
                source=SourceInfo(source_type=SourceType.PUSH, source_tag="uploads"),
                tags=Tagging(tag_ids=list(tag_ids)),
            )
        )
    service = MetadataService.__new__(MetadataService)
    service.metadata_store = store
    service.rebac = _Rebac(denied)
    return service


@pytest.mark.asyncio
async def test_matches_name_ignoring_case_in_name_order():
    service = await _service(["b-Rapport.pdf", "notes.md", "a-rapport.docx"])

    found = await service.find_documents_in_tags(USER, ["lib-a"], "RAPP", 20)

    assert [d.document_name for d in found] == ["a-rapport.docx", "b-Rapport.pdf"]


@pytest.mark.asyncio
async def test_only_requested_tags_are_searched():
    service = await _service(["rapport.pdf"], tag_ids=("lib-b",))

    assert await service.find_documents_in_tags(USER, ["lib-a"], "", 20) == []
    assert await service.find_documents_in_tags(USER, [], "", 20) == []


@pytest.mark.asyncio
async def test_unreadable_documents_are_skipped_and_limit_is_filled():
    service = await _service(["a.pdf", "b.pdf", "c.pdf", "d.pdf", "e.pdf"], denied={"a.pdf"})

    found = await service.find_documents_in_tags(USER, ["lib-a"], "", 2)

    assert [d.document_name for d in found] == ["b.pdf", "c.pdf"]
    # Read access is checked page by page, never on documents past the limit.
    assert "e.pdf" not in service.rebac.checked


@pytest.mark.parametrize("body", [{"tag_ids": ["t"], "limit": 51}, {"tag_ids": ["t"], "query": "x" * 201}, {"tag_ids": ["t"] * 501}])
def test_request_bounds(body):
    with pytest.raises(ValidationError):
        FindDocumentsRequest(**body)
