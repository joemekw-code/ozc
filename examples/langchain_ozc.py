"""OZC as LangChain tools. Drop into any LangChain agent.

Requires:  pip install langchain web3 eth-account
Env:       OZC_PRIVATE_KEY=0x...  (a Base wallet with tiny amount of ETH)
"""

import json, os
from langchain.tools import tool
from web3 import Web3
from eth_account import Account

REGISTRY = Web3.to_checksum_address("0x3ca993e7183824e11b2a65cf183b4c3521bf4754")
TOKEN    = Web3.to_checksum_address("0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144")
SPONSOR  = Web3.to_checksum_address("0xea827C90a2ed12afcebBFaF5CBd577c10905222d")

w3 = Web3(Web3.HTTPProvider(os.getenv("OZC_RPC", "https://base-rpc.publicnode.com")))
acct = Account.from_key(os.environ["OZC_PRIVATE_KEY"])

REG_ABI = json.loads("""[
  {"name":"nextId","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"name":"entries","type":"function","stateMutability":"view","inputs":[{"type":"uint256"}],
   "outputs":[{"type":"bytes32"},{"type":"address"},{"type":"string"},{"type":"uint256"},{"type":"uint256"},{"type":"uint256"},{"type":"bool"}]},
  {"name":"currentPrice","type":"function","stateMutability":"view","inputs":[{"type":"uint256"}],"outputs":[{"type":"uint256"}]},
  {"name":"stake","type":"function","inputs":[{"type":"uint256"},{"type":"uint256"}],"outputs":[]},
  {"name":"deploy","type":"function","inputs":[{"type":"bytes32"},{"type":"string"},{"type":"uint256"}],"outputs":[{"type":"uint256"}]}
]""")
TOK_ABI = json.loads('[{"name":"approve","type":"function","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[{"type":"bool"}]}]')
reg = w3.eth.contract(address=REGISTRY, abi=REG_ABI)
tok = w3.eth.contract(address=TOKEN,    abi=TOK_ABI)

def _send(fn):
    tx = fn.build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": 8453,
    })
    signed = acct.sign_transaction(tx)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(h).transactionHash.hex()

@tool
def ozc_list_claims() -> str:
    """List all claims currently published on OZC with their signal backing."""
    n = reg.functions.nextId().call()
    out = []
    for i in range(n):
        e = reg.functions.entries(i).call()
        try: meta = json.loads(e[2])
        except: meta = {}
        out.append({
            "id": i, "title": meta.get("title"), "description": meta.get("description"),
            "claim_type": meta.get("claim_type"), "shareSupply": e[3],
            "collected_signal": e[4] / 1e18,
        })
    return json.dumps(out, indent=2)

@tool
def ozc_back_claim(id: int, units: int) -> str:
    """Back a claim by id with N units of signal. You commit to this judgment."""
    _send(tok.functions.approve(REGISTRY, 10**24))
    return _send(reg.functions.stake(id, units))

@tool
def ozc_publish_claim(raw_text: str, title: str, description: str) -> str:
    """Publish a new claim. You become author; later backers pay you 5% attribution."""
    _send(tok.functions.approve(REGISTRY, 10**24))
    h = Web3.keccak(text=raw_text)
    meta = json.dumps({"title": title, "description": description})
    return _send(reg.functions.deploy(h, meta, 1))

# Use in any LangChain agent:
#   from langchain_ozc import ozc_list_claims, ozc_back_claim, ozc_publish_claim
#   agent = initialize_agent([ozc_list_claims, ozc_back_claim, ozc_publish_claim], llm, ...)
