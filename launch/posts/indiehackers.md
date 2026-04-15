# I Built a Trust Layer for AI Agents on Base — No UI, No Token, Just a Ledger

Quick intro: I shipped **OZC** — a tiny on-chain protocol that lets humans and AI agents publish claims, back them with signal, and read the resulting distribution as a trust surface. It's live on Base mainnet, the CLI works over `npx`, and there's an MCP server so agents can use it natively.

- Repo: https://github.com/joemekw-code/ozc
- npm: `@joejoejoejoe/ozc`
- 60-second demo:

![OZC demo](https://raw.githubusercontent.com/joemekw-code/ozc/main/launch/demo.gif)

I'm posting here because I want feedback from people who ship small, weird, independent things — not VCs, not DAO tourists. OZC is not a company. It might never be. But the problem it attacks is big enough that I wanted to put it in front of builders first.

---

## The problem, in one paragraph

LLMs are confidently wrong thousands of times a day. Agents quote other agents. Hallucinations compound silently because there's no shared ledger where a claim, its author, and the conviction behind it live together. Every tool that wants to ask "is this true?" has to re-invent trust from scratch, usually by piping everything back to a human or a different LLM. That doesn't scale, and it puts authority right back in the middle — which is the thing the whole "autonomous agent" story was supposed to remove.

OZC is an experiment in making trust a primitive instead of a service.

---

## How it actually works (for builders)

Three operations. That's the whole protocol.

**1. Publish a claim.**

```bash
ozc publish "Shopify merchants using AI chat convert 18% better (Shopify Q4 2025)" \
  --tag ecommerce --url https://example.com/shopify-q4.pdf
# → claim-id: 0x7f3a…  author: 0xYou
```

The claim is stored as a content hash + metadata on Base. Author is the signer. That's the provenance.

**2. Back it with signal.**

```bash
ozc signal 0x7f3a… --amount 10
```

Signal is **not** a purchase. You can't buy it. Each address receives a fixed initial allocation. You allocate from that to claims you're willing to be wrong about in public. Late backers face a steeper cost than early ones — so piling on after a claim is already popular costs more from your budget than committing early.

**3. Read the distribution.**

```bash
ozc show 0x7f3a…
# total signal: 137.2   backers: 19   first signal: 2026-02-11
# concentration: 0.42   (Gini-ish — low = broad agreement, high = polarized)
```

You don't get a verdict. You get a *distribution*. Whoever consumes it — a human, another agent, a dashboard — decides how to use it.

---

## The indie-hacker-relevant design decisions

I've built enough failed side projects to know what kills them. Here's what I cut on purpose:

**No UI.** Every previous attempt at "trust infrastructure" has been a website. Websites require users, users require marketing, marketing requires a thesis that fits in a tweet. I don't have one. What I have is a CLI and an MCP server. If the primitive is useful, someone will wrap it. If it isn't, a dashboard would just be debt.

**No token sale, no points, no airdrop.** Signal is not transferable and not for sale. This kills the entire "whale sets truth" failure mode. It also means there's no reason to ship OZC to Product Hunt or exchanges — the incentive to post is that your claim either survives scrutiny or doesn't.

**Shipped on Base, not my own chain.** I wanted real gas, real addresses, real finality. Base is ~$0.001 per op and has the tooling. Running my own chain would have been a year of work to sidestep a problem that doesn't exist.

**400 lines of Solidity, no admin, no upgradability.** If the contract has a bug, I ship a new one and let people migrate. I refuse to be the trusted operator of a protocol whose entire point is removing trusted operators.

**MCP server is the real distribution surface.** The CLI is for humans kicking tires. The MCP server is how agents will actually use it:

```jsonc
{
  "mcpServers": {
    "ozc": {
      "command": "npx",
      "args": ["-y", "github:joemekw-code/ozc", "mcp"]
    }
  }
}
```

Drop that in Claude Desktop or Cursor and your agent gets four tools: publish, signal, read, search. No setup beyond a funded address on Base.

---

## What I'm actually hoping happens

I'll be blunt about the bet, because I think indie hackers respect that more than a pitch.

**Bet 1 (most likely):** Nothing happens. OZC sits as a reference implementation. That's fine — it's 400 lines, nothing to maintain, and the contract is immutable.

**Bet 2 (what I'm watching for):** Agent framework authors add it as a default tool. Not because I asked, but because once one agent cites an on-chain hash instead of inventing a source, the others look sloppy by comparison. This is how Git won — nobody "adopted" it, it just made the alternative look embarrassing.

**Bet 3 (the long one):** The signal distribution on OZC starts correlating with later-verified truth better than majority-vote LLM ensembles on the same questions. If that happens — even weakly — there's a real public good here. I'll publish the scoreboard openly either way.

None of these require OZC to be a business. That's the whole point. Infrastructure that needs a business model to survive isn't infrastructure, it's a product pretending.

---

## Numbers, honestly

- 3 weeks from first commit to Base mainnet deploy
- $41 total spend (domain + RPC credits + gas for deployment)
- ~400 LOC Solidity, ~1.2k LOC TypeScript (CLI + MCP)
- 0 employees, 0 investors, 0 Discord
- 1 person (me)

I'm not trying to quit my job with this. I'm trying to run an experiment that couldn't run under a normal company's incentives, because the right answer might be "this doesn't work and should stay free forever."

---

## What I'd love from this community

1. **Adversarial signal.** Post a claim. Attack it. Find the incentive leak I missed. The protocol only works if people try to break it.
2. **Critique of the cost-increase math.** `src/` has the full spec. If the commitment-gradient math is wrong, I want to know before anyone real uses this.
3. **Weird use cases.** I've been thinking about agents citing OZC in research pipelines. Someone already asked about using it for bug-bounty claim provenance. I'd like to hear stranger ideas.
4. **Brutal feedback on the README.** If you read the repo and went "I don't get what this is for," tell me exactly where you bounced.

---

## Try it in one line

```bash
npx -y github:joemekw-code/ozc list
```

That's it. No signup, no wallet connect, no newsletter. If it's interesting, the repo is there. If it isn't, you spent four seconds.

- GitHub: https://github.com/joemekw-code/ozc
- npm: https://www.npmjs.com/package/@joejoejoejoe/ozc

Thanks for reading. Happy to answer anything in the comments — especially the uncomfortable questions.
