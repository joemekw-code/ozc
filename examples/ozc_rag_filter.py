"""
OZC as a personal re-ranker for any RAG pipeline.

3-line drop-in: take your retriever's URL/doc list, annotate with on-chain commitments,
then combine with your own similarity score however you want.

Requires: pip install web3 eth-account  (no OZC_PRIVATE_KEY needed for read-only enrichment)
"""

from web3 import Web3

RPC = "https://base-rpc.publicnode.com"
UV  = Web3.to_checksum_address("0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd")
CV  = Web3.to_checksum_address("0x675d23f2e14ee862846e375ba385eae567d5d985")

UV_ABI = [
  {"name":"shareSupply","type":"function","stateMutability":"view","inputs":[{"type":"bytes32"}],"outputs":[{"type":"uint256"}]},
  {"name":"reserve","type":"function","stateMutability":"view","inputs":[{"type":"bytes32"}],"outputs":[{"type":"uint256"}]},
]
CV_ABI = [
  {"name":"totalReceivedAsCreator","type":"function","stateMutability":"view","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}]},
]

w3  = Web3(Web3.HTTPProvider(RPC))
uv  = w3.eth.contract(address=UV, abi=UV_ABI)
cv  = w3.eth.contract(address=CV, abi=CV_ABI)

def enrich(identifiers):
    """Annotate each identifier with on-chain commitment data.
    Returns: list of dicts (identifier, committed_eth, shares).
    """
    out = []
    for ident in identifiers:
        id_ = w3.keccak(text=ident)
        try:
            supply = uv.functions.shareSupply(id_).call()
            reserve = uv.functions.reserve(id_).call()
        except Exception:
            supply, reserve = 0, 0
        out.append({
            "identifier":   ident,
            "committed_eth": reserve / 1e18,
            "shares":        supply,
        })
    return out

def author_score(address):
    """Total ETH received as creator across all their claims."""
    total = cv.functions.totalReceivedAsCreator(address).call()
    return total / 1e18

def rank(items, weights=None, your_score=None):
    """Compose OZC signals with your own score. You choose the weights.
    weights: dict e.g. {"committed_eth": 0.5, "shares": 0.2}
    your_score: dict mapping identifier → your custom score (from vector similarity, etc.)
                Will be used as a third dimension "yours".
    """
    weights = dict(weights or {"committed_eth": 1.0})
    if your_score is not None:
        for it in items:
            it["yours"] = your_score.get(it["identifier"], 0)
        weights.setdefault("yours", 0.5)

    dims = list(weights)
    maxs = {d: max((it.get(d, 0) for it in items), default=1e-18) or 1e-18 for d in dims}
    scored = []
    for it in items:
        s = sum(weights[d] * (it.get(d, 0) / maxs[d]) for d in dims)
        scored.append({**it, "score": s})
    return sorted(scored, key=lambda x: x["score"], reverse=True)


# === Quick demo ===
if __name__ == "__main__":
    urls = [
        "https://github.com/joemekw-code/ozc",
        "https://example.com/some-article",
        "https://github.com/ethereum/eips",
    ]
    annotated = enrich(urls)
    print("--- enriched ---")
    for r in annotated: print(r)

    ranked = rank(annotated, weights={"committed_eth": 1.0})
    print("\n--- ranked by committed ETH ---")
    for r in ranked: print(f"{r['score']:.3f}  {r['identifier']}")
