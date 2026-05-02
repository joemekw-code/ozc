from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean


SEED = 42
CATEGORIES = [
    "社会・政治",
    "お金・資産",
    "男女・性別",
    "外国人問題",
    "テクノロジー",
    "医療・福祉",
    "生活",
    "その他",
]


@dataclass
class Claim:
    id: int
    issue_id: int
    quality: float
    sensationalism: float
    creator_kind: str
    category: str
    created_step: int
    total_stake: float = 0.0
    locked_stake: dict[int, list[tuple[float, int]]] = field(default_factory=dict)


@dataclass
class Issue:
    id: int
    category: str
    creator_kind: str
    created_step: int
    claim_ids: list[int] = field(default_factory=list)
    total_stake: float = 0.0


@dataclass
class Agent:
    id: int
    kind: str
    balance: float


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def make_agents(rng: random.Random, n_agents: int = 260) -> list[Agent]:
    agents: list[Agent] = []
    kinds = (
        ["informed"] * 95
        + ["attention"] * 80
        + ["trend"] * 45
        + ["contrarian"] * 25
        + ["manipulator"] * 15
    )
    rng.shuffle(kinds)
    for i, kind in enumerate(kinds[:n_agents]):
        if kind == "manipulator":
            balance = rng.uniform(180, 260)
        elif kind == "informed":
            balance = rng.uniform(70, 130)
        else:
            balance = rng.uniform(40, 100)
        agents.append(Agent(id=i, kind=kind, balance=balance))
    return agents


def claim_value(agent: Agent, claim: Claim, current_step: int) -> float:
    age = max(1, current_step - claim.created_step + 1)
    recency = 1 / age
    trend = math.log1p(claim.total_stake)
    if agent.kind == "informed":
        return 1.6 * claim.quality + 0.25 * trend - 0.35 * claim.sensationalism + 0.05 * recency
    if agent.kind == "attention":
        return 0.7 * claim.quality + 0.9 * claim.sensationalism + 0.25 * trend + 0.1 * recency
    if agent.kind == "trend":
        return 0.25 * claim.quality + 1.05 * trend + 0.25 * recency
    if agent.kind == "contrarian":
        return 1.0 * claim.quality - 0.35 * trend + 0.15 * recency
    return -0.8 * claim.quality + 1.2 * claim.sensationalism + 0.4 * trend + 0.1 * recency


def create_issue_and_claim(
    rng: random.Random,
    issues: dict[int, Issue],
    claims: dict[int, Claim],
    issue_counter: int,
    claim_counter: int,
    agent: Agent,
    step: int,
    min_stake: float,
) -> tuple[int, int]:
    category = rng.choice(CATEGORIES)
    if agent.kind == "informed":
        issue_quality = clamp(rng.gauss(0.72, 0.12), 0.05, 0.98)
        sensationalism = clamp(rng.gauss(0.30, 0.18), 0.02, 0.95)
    elif agent.kind == "manipulator":
        issue_quality = clamp(rng.gauss(0.22, 0.12), 0.02, 0.90)
        sensationalism = clamp(rng.gauss(0.88, 0.08), 0.10, 0.99)
    else:
        issue_quality = clamp(rng.gauss(0.52, 0.20), 0.02, 0.95)
        sensationalism = clamp(rng.gauss(0.55, 0.22), 0.02, 0.99)

    issues[issue_counter] = Issue(
        id=issue_counter,
        category=category,
        creator_kind=agent.kind,
        created_step=step,
    )
    claims[claim_counter] = Claim(
        id=claim_counter,
        issue_id=issue_counter,
        quality=issue_quality,
        sensationalism=sensationalism,
        creator_kind=agent.kind,
        category=category,
        created_step=step,
    )
    issues[issue_counter].claim_ids.append(claim_counter)

    amount = min(min_stake, agent.balance)
    if amount > 0:
        stake_claim(issues, claims, agent, claim_counter, amount, step)
    return issue_counter + 1, claim_counter + 1


def stake_claim(
    issues: dict[int, Issue],
    claims: dict[int, Claim],
    agent: Agent,
    claim_id: int,
    amount: float,
    step: int,
) -> None:
    claim = claims[claim_id]
    issue = issues[claim.issue_id]
    amount = min(amount, agent.balance)
    if amount <= 0:
        return
    agent.balance -= amount
    claim.total_stake += amount
    issue.total_stake += amount
    claim.locked_stake.setdefault(agent.id, []).append((amount, step))


def release_locked(agent: Agent, claim: Claim, issue: Issue, current_step: int, cooldown: int) -> float:
    holdings = claim.locked_stake.get(agent.id, [])
    if not holdings:
        return 0.0
    remaining: list[tuple[float, int]] = []
    released = 0.0
    for amount, step in holdings:
        if current_step - step >= cooldown:
            released += amount
        else:
            remaining.append((amount, step))
    if released:
        claim.total_stake -= released
        issue.total_stake -= released
        agent.balance += released
    if remaining:
        claim.locked_stake[agent.id] = remaining
    else:
        claim.locked_stake.pop(agent.id, None)
    return released


def maybe_withdraw(
    rng: random.Random,
    issues: dict[int, Issue],
    claims: dict[int, Claim],
    agent: Agent,
    step: int,
    cooldown: int,
) -> float:
    if cooldown <= 0 and rng.random() > 0.2:
        return 0.0
    if cooldown > 0 and rng.random() > 0.08:
        return 0.0

    candidate_ids = [cid for cid, claim in claims.items() if agent.id in claim.locked_stake]
    if not candidate_ids:
        return 0.0
    claim = claims[rng.choice(candidate_ids)]
    issue = issues[claim.issue_id]
    return release_locked(agent, claim, issue, step, cooldown)


def summarize(issues: dict[int, Issue], claims: dict[int, Claim]) -> dict[str, float]:
    ranked_claims = sorted(claims.values(), key=lambda c: c.total_stake, reverse=True)
    ranked_issues = sorted(issues.values(), key=lambda i: i.total_stake, reverse=True)

    top_claims = ranked_claims[:20]
    top_issues = ranked_issues[:10]

    top_claim_quality = mean(c.quality for c in top_claims) if top_claims else 0.0
    top_issue_quality = (
        mean(mean(claims[cid].quality for cid in issue.claim_ids) for issue in top_issues)
        if top_issues
        else 0.0
    )
    high_quality_stake = sum(c.total_stake for c in claims.values() if c.quality >= 0.65)
    low_quality_stake = sum(c.total_stake for c in claims.values() if c.quality < 0.35)
    sensational_low_quality_top = sum(
        1 for c in top_claims if c.quality < 0.35 and c.sensationalism > 0.65
    )
    manipulator_captured = sum(
        1 for c in top_claims if c.creator_kind == "manipulator" and c.quality < 0.35
    )

    category_totals: dict[str, float] = {category: 0.0 for category in CATEGORIES}
    for issue in issues.values():
        category_totals[issue.category] += issue.total_stake

    return {
        "n_issues": len(issues),
        "n_claims": len(claims),
        "top_claim_quality_mean": round(top_claim_quality, 4),
        "top_issue_quality_mean": round(top_issue_quality, 4),
        "high_quality_stake_share": round(high_quality_stake / max(1.0, sum(i.total_stake for i in issues.values())), 4),
        "low_quality_stake_share": round(low_quality_stake / max(1.0, sum(i.total_stake for i in issues.values())), 4),
        "sensational_low_quality_top20_share": round(sensational_low_quality_top / max(1, len(top_claims)), 4),
        "manipulator_capture_top20_share": round(manipulator_captured / max(1, len(top_claims)), 4),
        "top_category_total_stake": round(max(category_totals.values()) if category_totals else 0.0, 4),
    }


def composite_score(summary: dict[str, float]) -> float:
    return round(
        1.8 * summary["high_quality_stake_share"]
        + 1.2 * summary["top_claim_quality_mean"]
        + 1.0 * summary["top_issue_quality_mean"]
        - 1.4 * summary["low_quality_stake_share"]
        - 1.2 * summary["sensational_low_quality_top20_share"]
        - 1.0 * summary["manipulator_capture_top20_share"],
        4,
    )


def run_scenario(name: str, min_stake: float, cooldown: int, steps: int = 180) -> dict:
    rng = random.Random(SEED + int(min_stake * 10) + cooldown * 100)
    agents = make_agents(rng)
    issues: dict[int, Issue] = {}
    claims: dict[int, Claim] = {}
    issue_counter = 0
    claim_counter = 0

    created_issues = 0
    created_claims = 0
    stakes_placed = 0
    withdrawn_total = 0.0

    for step in range(steps):
        rng.shuffle(agents)
        for agent in agents:
            if agent.balance >= min_stake and rng.random() < 0.02:
                issue_counter, claim_counter = create_issue_and_claim(
                    rng, issues, claims, issue_counter, claim_counter, agent, step, min_stake
                )
                created_issues += 1
                created_claims += 1
                stakes_placed += 1
                continue

            if issues and agent.balance >= min_stake and rng.random() < 0.06:
                issue = rng.choice(list(issues.values()))
                if issue.claim_ids:
                    quality_shift = 0.0
                    if agent.kind == "informed":
                        quality_shift = 0.1
                    elif agent.kind == "manipulator":
                        quality_shift = -0.12
                    quality = clamp(
                        mean(claims[cid].quality for cid in issue.claim_ids) + quality_shift + rng.gauss(0, 0.15),
                        0.02,
                        0.98,
                    )
                    sensationalism = clamp(
                        rng.gauss(0.45 if agent.kind != "manipulator" else 0.9, 0.18),
                        0.02,
                        0.99,
                    )
                    claims[claim_counter] = Claim(
                        id=claim_counter,
                        issue_id=issue.id,
                        quality=quality,
                        sensationalism=sensationalism,
                        creator_kind=agent.kind,
                        category=issue.category,
                        created_step=step,
                    )
                    issue.claim_ids.append(claim_counter)
                    amount = min(min_stake, agent.balance)
                    if amount > 0:
                        stake_claim(issues, claims, agent, claim_counter, amount, step)
                        stakes_placed += 1
                    claim_counter += 1
                    created_claims += 1
                    continue

            if claims and agent.balance >= min_stake:
                best = max(
                    claims.values(),
                    key=lambda claim: claim_value(agent, claim, step) + rng.uniform(-0.06, 0.06),
                )
                multiplier = 1.0
                if agent.kind == "manipulator":
                    multiplier = 1.9
                elif agent.kind == "trend":
                    multiplier = 1.2
                elif agent.kind == "informed":
                    multiplier = 1.3
                amount = min(agent.balance, min_stake * rng.uniform(1.0, 3.2) * multiplier)
                if amount >= min_stake:
                    stake_claim(issues, claims, agent, best.id, amount, step)
                    stakes_placed += 1

            withdrawn_total += maybe_withdraw(rng, issues, claims, agent, step, cooldown)

    summary = summarize(issues, claims)
    score = composite_score(summary)
    return {
        "scenario": name,
        "params": {"min_stake": min_stake, "cooldown_steps": cooldown, "steps": steps},
        "activity": {
            "created_issues": created_issues,
            "created_claims": created_claims,
            "stakes_placed": stakes_placed,
            "withdrawn_total": round(withdrawn_total, 4),
        },
        "summary": summary,
        "composite_score": score,
    }


def main() -> None:
    scenarios = [
        ("open_low_friction", 1.0, 0),
        ("cooldown_light", 1.0, 8),
        ("cooldown_medium", 3.0, 8),
        ("cooldown_strict", 5.0, 12),
        ("high_barrier", 8.0, 16),
    ]
    results = [run_scenario(name, min_stake, cooldown) for name, min_stake, cooldown in scenarios]
    ranked = sorted(results, key=lambda item: item["composite_score"], reverse=True)
    best = ranked[0]

    payload = {
        "purpose": [
            "価値ある主張にステークが残りやすいか",
            "低品質・扇動的主張が上位を奪い続けないか",
            "最低ステーク額と引き出しクールダウンの妥当レンジを探る",
        ],
        "results": results,
        "ranking": [
            {
                "scenario": item["scenario"],
                "composite_score": item["composite_score"],
                "top_claim_quality_mean": item["summary"]["top_claim_quality_mean"],
                "high_quality_stake_share": item["summary"]["high_quality_stake_share"],
                "low_quality_stake_share": item["summary"]["low_quality_stake_share"],
                "manipulator_capture_top20_share": item["summary"]["manipulator_capture_top20_share"],
            }
            for item in ranked
        ],
        "best_scenario": {
            "scenario": best["scenario"],
            "params": best["params"],
            "composite_score": best["composite_score"],
            "why_it_moves_forward": [
                "high_quality_stake_share が最も高い側",
                "manipulator_capture_top20_share が抑えられている",
                "top_claim_quality_mean と top_issue_quality_mean が両立している",
            ],
        },
    }

    out_path = Path("/Users/maekawasei/ozc/analysis/results/ozc_attention_sim.json")
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
