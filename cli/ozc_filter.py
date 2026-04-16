"""
OZC Filter — Personal information trust layer for any AI/agent.

Drop this file into your project. No pip install needed.

Usage:
    from ozc_filter import OZCFilter

    f = OZCFilter()                          # connects to public OZC network
    f = OZCFilter(min_trust=10)              # only show info with >= 10 OZC staked
    f = OZCFilter(endpoint="http://localhost:8767")  # use local node

    # Filter URLs by trust score
    ranked = f.filter_urls(["https://bitcoin.org/bitcoin.pdf", "https://scam.example.com"])
    # → [{"url": "bitcoin.org/bitcoin.pdf", "trust_score": 55.0, ...}, {"url": "scam.example.com", "trust_score": 0, ...}]

    # Search by keyword
    results = f.search("prediction market")
    # → [{"title": "...", "trust_score": 15.0, "url": "https://en.wikipedia.org/...", ...}]

    # Stake on a URL (register your trust signal)
    f.stake_url("https://arxiv.org/abs/...", amount=10, agent="my-agent")

    # Use as RAG reranker: rerank retrieved docs by trust score
    reranked = f.rerank(docs, key=lambda d: d["source_url"])

    # LLM system prompt injection
    prompt = f.system_prompt()
    # → "You have access to OZC trust scores. When citing sources, prefer those with higher trust scores..."
"""
import json
import urllib.request
import urllib.parse
from typing import List, Dict, Optional, Any, Callable


class OZCFilter:
    def __init__(self, endpoint: str = "http://localhost:8767", min_trust: float = 0, agent: str = "default"):
        self.endpoint = endpoint.rstrip("/")
        self.min_trust = min_trust
        self.agent = agent

    def filter_urls(self, urls: List[str], min_trust: Optional[float] = None) -> List[Dict]:
        mt = min_trust if min_trust is not None else self.min_trust
        params = urllib.parse.urlencode({"urls": ",".join(urls), "min_trust": mt, "sort": "trust"})
        return self._get(f"/api/filter?{params}").get("results", [])

    def search(self, query: str, min_trust: Optional[float] = None) -> List[Dict]:
        mt = min_trust if min_trust is not None else self.min_trust
        params = urllib.parse.urlencode({"q": query, "min_trust": mt, "sort": "trust"})
        return self._get(f"/api/filter?{params}").get("results", [])

    def all(self, min_trust: Optional[float] = None) -> List[Dict]:
        mt = min_trust if min_trust is not None else self.min_trust
        params = urllib.parse.urlencode({"min_trust": mt, "sort": "trust"})
        return self._get(f"/api/filter?{params}").get("results", [])

    def stake_url(self, url: str, amount: float = 10, title: str = "", summary: str = "") -> Dict:
        return self._post("/api/market/stake-url", {
            "agent": self.agent, "url": url, "amount": amount,
            "title": title or url[:80], "summary": summary
        })

    def rerank(self, docs: List[Any], key: Callable = lambda d: d.get("url", ""), min_trust: Optional[float] = None) -> List[Any]:
        urls = [key(d) for d in docs]
        url_to_doc = {}
        for d, u in zip(docs, urls):
            url_to_doc.setdefault(u, []).append(d)

        scored = self.filter_urls(list(set(urls)), min_trust)
        url_scores = {r["url"]: r["trust_score"] for r in scored}

        result = []
        for d, u in zip(docs, urls):
            result.append((url_scores.get(u, 0), d))
        result.sort(key=lambda x: x[0], reverse=True)
        return [d for _, d in result]

    def system_prompt(self) -> str:
        top = self.all(min_trust=1)[:10]
        if not top:
            return "OZC trust data unavailable."
        lines = ["You have access to OZC trust scores for information sources.",
                 "When citing sources, prefer those with higher trust scores.",
                 "Trust scores reflect how much OZC has been staked on the information.",
                 "",
                 "Top trusted sources:"]
        for r in top:
            url = r.get("url") or r.get("title", "")
            lines.append(f"  [{r['trust_score']:.1f} OZC] {r.get('title','')} — {url}")
        return "\n".join(lines)

    def sync_ledger(self) -> Dict:
        """Download the full shared ledger. Use this to get a local copy of the index."""
        return self._get("/api/ledger")

    def add_memo(self, data_id: str, memo: str) -> Dict:
        """Annotate an entry with an AI-readable memo."""
        return self._post("/api/ledger/memo", {"data_id": data_id, "memo": memo})

    def import_entries(self, entries: List[Dict]) -> Dict:
        """Import entries from another node into the shared ledger."""
        return self._post("/api/ledger/import", {"entries": entries})

    def _get(self, path: str) -> Dict:
        try:
            req = urllib.request.Request(self.endpoint + path)
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"results": [], "error": str(e)}

    def _post(self, path: str, data: Dict) -> Dict:
        try:
            body = json.dumps(data).encode()
            req = urllib.request.Request(self.endpoint + path, data=body,
                                        headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"error": str(e)}


if __name__ == "__main__":
    f = OZCFilter()
    print("=== OZC Filter Test ===\n")

    print("1. All items (min_trust=0):")
    for r in f.all():
        print(f"   [{r['trust_score']:>8.1f} OZC] {r.get('title','')[:50]}  {r.get('url','')[:40]}")

    print("\n2. Filter URLs:")
    urls = ["https://bitcoin.org/bitcoin.pdf", "https://scam.example.com"]
    for r in f.filter_urls(urls):
        print(f"   {r['url'][:50]:50s} → {r['trust_score']:.1f} OZC ({r['match']})")

    print("\n3. Search 'prediction':")
    for r in f.search("prediction"):
        print(f"   [{r['trust_score']:.1f} OZC] {r.get('title','')[:50]}")

    print("\n4. System prompt for LLM:")
    print(f.system_prompt()[:300])

    print("\n5. Rerank demo:")
    docs = [{"text": "some text", "url": "https://scam.example.com"},
            {"text": "bitcoin paper", "url": "https://bitcoin.org/bitcoin.pdf"}]
    reranked = f.rerank(docs, key=lambda d: d["url"])
    for d in reranked:
        print(f"   {d['url'][:50]}")
