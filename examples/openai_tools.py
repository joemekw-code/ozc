"""OZC exposed as OpenAI tool-calling schema. Works with any model supporting tools.

Requires:  pip install openai web3 eth-account
Env:       OPENAI_API_KEY, OZC_PRIVATE_KEY
"""
import json, os
from openai import OpenAI
from langchain_ozc import reg, tok, _send, REGISTRY  # reuse the helpers

OZC_TOOLS = [
  {"type":"function","function":{
    "name":"ozc_list_claims",
    "description":"List all claims published on OZC.",
    "parameters":{"type":"object","properties":{}}}},
  {"type":"function","function":{
    "name":"ozc_back_claim",
    "description":"Back a claim by id with N units of signal.",
    "parameters":{"type":"object",
      "properties":{"id":{"type":"integer"},"units":{"type":"integer"}},
      "required":["id","units"]}}},
]

def handle_tool(name, args):
    if name == "ozc_list_claims":
        n = reg.functions.nextId().call()
        return [{"id":i, "entry": reg.functions.entries(i).call()} for i in range(n)]
    if name == "ozc_back_claim":
        _send(tok.functions.approve(REGISTRY, 10**24))
        return _send(reg.functions.stake(args["id"], args["units"]))

client = OpenAI()
r = client.chat.completions.create(
  model="gpt-4o-mini",
  tools=OZC_TOOLS,
  messages=[{"role":"user","content":"Read OZC claims and back the ones you most believe to be true."}]
)
print(r.choices[0].message)
