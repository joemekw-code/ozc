"""
OZC as a LangChain BaseDocumentCompressor / re-ranker.

Example: take any LangChain retriever's output, re-rank with personal filter.
"""
from typing import Sequence, Optional
from langchain.schema import Document
from langchain.retrievers.document_compressors.base import BaseDocumentCompressor

from ozc_rag_filter import enrich, rank


class OZCReranker(BaseDocumentCompressor):
    """Personal on-chain re-ranker. You define the weights, OZC provides annotation."""
    weights: dict = {"committed_eth": 1.0}
    min_committed_eth: float = 0.0   # drop items below this threshold
    top_k: int = 10

    def compress_documents(
        self,
        documents: Sequence[Document],
        query: str,
        callbacks = None,
    ) -> Sequence[Document]:
        urls = [d.metadata.get("source") or d.metadata.get("url") or d.page_content[:80] for d in documents]
        annotated = enrich(urls)
        # map identifier → OZC data
        by_id = {a["identifier"]: a for a in annotated}
        items = []
        for d in documents:
            key = d.metadata.get("source") or d.metadata.get("url") or d.page_content[:80]
            a = by_id.get(key, {"identifier": key, "committed_eth": 0, "shares": 0})
            items.append({**a, "_doc": d})
        # optional threshold
        items = [x for x in items if x["committed_eth"] >= self.min_committed_eth]
        ranked = rank(items, weights=self.weights)
        return [x["_doc"] for x in ranked[: self.top_k]]


# Usage:
#   from langchain_rerank import OZCReranker
#   from langchain.retrievers import ContextualCompressionRetriever
#
#   compressor = OZCReranker(weights={"committed_eth": 0.7, "shares": 0.3}, top_k=5)
#   retriever = ContextualCompressionRetriever(
#       base_compressor=compressor,
#       base_retriever=your_existing_retriever,
#   )
#   # now drop into any agent
